#!/usr/bin/env node

/* global URL, process */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_INPUT_BYTES = 1_000_000;
const ALLOWED_CAPTURE_METHODS = new Set([
  "codex-browser-extension",
  "codex-browser",
  "manual",
]);
const ALLOWED_SEVERITIES = new Set(["SEV-1", "SEV-2", "SEV-3"]);

const fail = (message) => {
  throw new Error(`Site Capture rejected: ${message}`);
};

const object = (value, path) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  return value;
};

const string = (value, path, max = 700) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${path} must be a non-empty string`);
  }
  if (value.length > max) fail(`${path} must be at most ${max} characters`);
  return value.trim();
};

const number = (value, fallback, path) => {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`${path} must be a finite non-negative number`);
  }
  return value;
};

const isoTimestamp = (value, path) => {
  const raw = string(value, path, 64);
  if (Number.isNaN(Date.parse(raw))) fail(`${path} must be an ISO timestamp`);
  return new Date(raw).toISOString();
};

const webUrl = (value, path) => {
  let parsed;
  try {
    parsed = new URL(string(value, path, 2_000));
  } catch {
    fail(`${path} must be an absolute URL`);
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    fail(`${path} must use http or https`);
  }
  return parsed;
};

const array = (value, path, max = 100) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) {
    fail(`${path} must be an array with at most ${max} items`);
  }
  return value;
};

const jsonValue = (value, path, depth = 0) => {
  if (depth > 8) fail(`${path} exceeds 8 nesting levels`);
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 100) fail(`${path} has too many array items`);
    return value.map((item, index) =>
      jsonValue(item, `${path}[${index}]`, depth + 1),
    );
  }
  const input = object(value, path);
  if (Object.keys(input).length > 100) fail(`${path} has too many keys`);
  return Object.fromEntries(
    Object.entries(input).map(([key, item]) => [
      string(key, `${path} key`, 120),
      jsonValue(item, `${path}.${key}`, depth + 1),
    ]),
  );
};

const safeId = (value, prefix) => {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return normalized || prefix;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, precision = 0) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const serviceTelemetry = (id, values, timestamp) => ({
  serviceId: id,
  health: values.health,
  p50LatencyMs: round(values.p50LatencyMs),
  p95LatencyMs: round(values.p95LatencyMs),
  errorRatePct: round(values.errorRatePct, 1),
  requestsPerSecond: round(values.requestsPerSecond, 1),
  saturationPct: round(values.saturationPct),
  timestamp,
});

export const buildIncidentPack = (rawCapture) => {
  const capture = object(rawCapture, "capture");
  if (capture.schemaVersion !== 1) fail("schemaVersion must equal 1");
  const sessionId = safeId(string(capture.sessionId, "sessionId", 80), "SITE");
  const capturedAt = isoTimestamp(capture.capturedAt, "capturedAt");
  const capturedBy = string(capture.capturedBy, "capturedBy", 80);
  if (!ALLOWED_CAPTURE_METHODS.has(capturedBy)) {
    fail(
      "capturedBy must be codex-browser-extension, codex-browser, or manual",
    );
  }

  const target = object(capture.target, "target");
  const targetUrl = webUrl(target.url, "target.url");
  const title = string(target.title, "target.title", 240);
  const symptom = string(target.symptom, "target.symptom", 500);
  const customerImpact = string(
    target.customerImpact,
    "target.customerImpact",
    700,
  );
  const severity = target.severity ?? "SEV-2";
  if (!ALLOWED_SEVERITIES.has(severity)) {
    fail("target.severity must be SEV-1, SEV-2, or SEV-3");
  }

  const signals = object(capture.signals ?? {}, "signals");
  const pageLoadMs = number(signals.pageLoadMs, 1500, "signals.pageLoadMs");
  const resourceP95Ms = number(
    signals.resourceP95Ms,
    Math.max(500, pageLoadMs * 0.5),
    "signals.resourceP95Ms",
  );
  const failedRequests = number(
    signals.failedRequests,
    0,
    "signals.failedRequests",
  );
  const resourceCount = Math.max(
    1,
    number(signals.resourceCount, 1, "signals.resourceCount"),
  );
  const consoleErrorCount = number(
    signals.consoleErrorCount,
    0,
    "signals.consoleErrorCount",
  );
  const interactiveElementCount = number(
    signals.interactiveElementCount,
    1,
    "signals.interactiveElementCount",
  );
  const networkErrorRate = (failedRequests / resourceCount) * 100;
  const pageErrorRate = clamp(consoleErrorCount * 2, 0, 100);

  const toolNames = new Set();
  const observedWebMCPTools = array(capture.webMcpTools, "webMcpTools").map(
    (toolValue, index) => {
      const tool = object(toolValue, `webMcpTools[${index}]`);
      const name = string(tool.name, `webMcpTools[${index}].name`, 160);
      if (toolNames.has(name)) fail(`webMcpTools contains duplicate ${name}`);
      toolNames.add(name);
      if (typeof tool.readOnly !== "boolean") {
        fail(`webMcpTools[${index}].readOnly must be boolean`);
      }
      if (typeof tool.destructive !== "boolean") {
        fail(`webMcpTools[${index}].destructive must be boolean`);
      }
      return {
        name,
        ...(tool.title === undefined
          ? {}
          : { title: string(tool.title, `webMcpTools[${index}].title`, 240) }),
        ...(tool.description === undefined
          ? {}
          : {
              description: string(
                tool.description,
                `webMcpTools[${index}].description`,
                700,
              ),
            }),
        readOnly: tool.readOnly,
        destructive: tool.destructive,
      };
    },
  );

  const evidence = array(capture.evidence, "evidence").map(
    (evidenceValue, index) => {
      const item = object(evidenceValue, `evidence[${index}]`);
      const kind = item.kind ?? "browser";
      if (!new Set(["browser", "webmcp"]).has(kind)) {
        fail(`evidence[${index}].kind must be browser or webmcp`);
      }
      const surface = item.surface ?? "page-runtime";
      if (!new Set(["page-runtime", "browser-network"]).has(surface)) {
        fail(`evidence[${index}].surface must name a generated surface`);
      }
      return {
        id: safeId(
          string(item.id, `evidence[${index}].id`, 120),
          `E-${index + 1}`,
        ),
        kind,
        summary: string(item.summary, `evidence[${index}].summary`, 500),
        serviceIds: [surface],
      };
    },
  );
  evidence.unshift({
    id: "E-SITE-CAPTURE",
    kind: "browser",
    summary: `Codex captured ${title} at ${targetUrl.origin}; target content is treated as untrusted evidence.`,
    serviceIds: ["page-runtime", "browser-network"],
  });
  if (observedWebMCPTools.length > 0) {
    evidence.push({
      id: "E-WEBMCP-SURFACE",
      kind: "webmcp",
      summary: `${observedWebMCPTools.length} WebMCP tools were observed on the exact target origin at capture time.`,
      serviceIds: ["page-runtime"],
    });
  }

  const candidateActions = array(
    capture.candidateActions,
    "candidateActions",
    12,
  );
  const operatorInstructions = array(
    capture.operatorHandoff,
    "operatorHandoff",
    12,
  ).map((step, index) => string(step, `operatorHandoff[${index}]`, 500));
  if (candidateActions.length === 0 && operatorInstructions.length === 0) {
    operatorInstructions.push(
      "Review the captured evidence and select a site-owned remediation path before making a change.",
    );
  }

  const mitigationCandidates = {};
  const mitigationEffects = {};
  const addCandidate = (candidate) => {
    if (mitigationCandidates[candidate.id]) {
      fail(`candidateActions contains duplicate ${candidate.id}`);
    }
    mitigationCandidates[candidate.id] = candidate;
    mitigationEffects[candidate.id] = {
      resultingConfig: {
        targetOrigin: targetUrl.origin,
        executionMode: candidate.execution.mode,
      },
      recoveryFrames: [],
    };
  };

  candidateActions.forEach((candidateValue, index) => {
    const candidate = object(candidateValue, `candidateActions[${index}]`);
    const webMcp = object(
      candidate.webMcp,
      `candidateActions[${index}].webMcp`,
    );
    const toolName = string(
      webMcp.toolName,
      `candidateActions[${index}].webMcp.toolName`,
      160,
    );
    if (!toolNames.has(toolName)) {
      fail(
        `candidateActions[${index}] names unobserved WebMCP tool ${toolName}`,
      );
    }
    const input = jsonValue(
      webMcp.input ?? {},
      `candidateActions[${index}].webMcp.input`,
    );
    if (Array.isArray(input) || input === null || typeof input !== "object") {
      fail(`candidateActions[${index}].webMcp.input must be an object`);
    }
    const targetSurface = candidate.targetSurface ?? "page-runtime";
    if (!new Set(["page-runtime", "browser-network"]).has(targetSurface)) {
      fail(`candidateActions[${index}].targetSurface is unknown`);
    }
    const risk = candidate.risk ?? "medium";
    if (!new Set(["low", "medium", "high"]).has(risk)) {
      fail(`candidateActions[${index}].risk is invalid`);
    }
    if (typeof candidate.reversible !== "boolean") {
      fail(`candidateActions[${index}].reversible must be boolean`);
    }
    const expected = object(
      candidate.expected ?? {},
      `candidateActions[${index}].expected`,
    );
    const id = safeId(
      string(candidate.id, `candidateActions[${index}].id`, 100),
      `M-SITE-${index + 1}`,
    );
    const assumptions = array(
      candidate.assumptions,
      `candidateActions[${index}].assumptions`,
      12,
    ).map((item, assumptionIndex) =>
      string(
        item,
        `candidateActions[${index}].assumptions[${assumptionIndex}]`,
        500,
      ),
    );
    if (assumptions.length === 0) {
      assumptions.push(
        "The target tool remains registered with the same schema after approval.",
        "Fresh read-only evidence can verify the result.",
      );
    }
    addCandidate({
      id,
      kind: "site-action",
      title: string(candidate.title, `candidateActions[${index}].title`, 200),
      targetService: targetSurface,
      description: string(
        candidate.description,
        `candidateActions[${index}].description`,
        700,
      ),
      exactActions: [
        {
          targetService: targetSurface,
          field: `webmcp:${toolName}`,
          from: "not invoked",
          to: JSON.stringify(input),
        },
      ],
      predictedP95Ms: number(
        expected.pageLoadMs,
        1500,
        `candidateActions[${index}].expected.pageLoadMs`,
      ),
      predictedErrorRatePct: number(
        expected.errorRatePct,
        0,
        `candidateActions[${index}].expected.errorRatePct`,
      ),
      estimatedRecoverySeconds: number(
        candidate.estimatedRecoverySeconds,
        60,
        `candidateActions[${index}].estimatedRecoverySeconds`,
      ),
      risk,
      reversible: candidate.reversible,
      assumptions,
      execution: {
        mode: "external-webmcp",
        targetOrigin: targetUrl.origin,
        toolName,
        input,
      },
    });
  });

  if (operatorInstructions.length > 0) {
    addCandidate({
      id: "M-OPERATOR-HANDOFF",
      kind: "operator-handoff",
      title: "Release an operator handoff",
      targetService: "page-runtime",
      description:
        "Preserve the evidence and give the operator an exact site-owned runbook. Runbook Zero will not claim that the site was changed automatically.",
      exactActions: [
        {
          targetService: "page-runtime",
          field: "operator-handoff",
          from: "not authorized",
          to: `${operatorInstructions.length} approved step${operatorInstructions.length === 1 ? "" : "s"}`,
        },
      ],
      predictedP95Ms: 1500,
      predictedErrorRatePct: 0,
      estimatedRecoverySeconds: 300,
      risk: "medium",
      reversible: true,
      assumptions: [
        "A human operator can perform and independently verify the listed steps.",
      ],
      execution: {
        mode: "operator-handoff",
        targetOrigin: targetUrl.origin,
        instructions: operatorInstructions,
      },
    });
  }

  const currentServices = {
    "page-runtime": serviceTelemetry(
      "page-runtime",
      {
        health:
          pageLoadMs > 2500 || pageErrorRate > 5 ? "critical" : "degraded",
        p50LatencyMs: pageLoadMs * 0.55,
        p95LatencyMs: pageLoadMs,
        errorRatePct: pageErrorRate,
        requestsPerSecond: interactiveElementCount,
        saturationPct: clamp((pageLoadMs / 2500) * 100, 0, 100),
      },
      capturedAt,
    ),
    "browser-network": serviceTelemetry(
      "browser-network",
      {
        health:
          failedRequests > 0 || resourceP95Ms > 1000 ? "degraded" : "healthy",
        p50LatencyMs: resourceP95Ms * 0.55,
        p95LatencyMs: resourceP95Ms,
        errorRatePct: networkErrorRate,
        requestsPerSecond: resourceCount / Math.max(pageLoadMs / 1000, 1),
        saturationPct: clamp((resourceP95Ms / 1200) * 100, 0, 100),
      },
      capturedAt,
    ),
  };
  const baselineServices = {
    "page-runtime": serviceTelemetry(
      "page-runtime",
      {
        health: "healthy",
        p50LatencyMs: 700,
        p95LatencyMs: 1500,
        errorRatePct: 0,
        requestsPerSecond: interactiveElementCount,
        saturationPct: 50,
      },
      capturedAt,
    ),
    "browser-network": serviceTelemetry(
      "browser-network",
      {
        health: "healthy",
        p50LatencyMs: 250,
        p95LatencyMs: 500,
        errorRatePct: 0,
        requestsPerSecond: resourceCount / Math.max(pageLoadMs / 1000, 1),
        saturationPct: 40,
      },
      capturedAt,
    ),
  };
  const firstCandidate = Object.values(mitigationCandidates)[0];
  const seed = Number.parseInt(
    createHash("sha256")
      .update(JSON.stringify(capture))
      .digest("hex")
      .slice(0, 8),
    16,
  );
  const eventBaseTimestamp = capturedAt;
  const recoveryTimestamp = new Date(
    Date.parse(capturedAt) + 60_000,
  ).toISOString();

  return {
    schemaVersion: 1,
    packId: `live-${sessionId.toLowerCase()}`,
    name: `${title} live incident`,
    summary: symptom,
    canonical: false,
    seed,
    agentPrompt:
      "Investigate this live-site capture, explain the evidence boundary, compare the available exact actions, and stage one for my review. Do not execute it.",
    impactPath: `${targetUrl.host} → browser session`,
    topologyTitle: "Captured browser surfaces",
    defaultServiceId: "page-runtime",
    defaultFlow: "page-session",
    eventBaseTimestamp,
    recoveryTimestamp,
    source: {
      kind: "live-site",
      url: targetUrl.href,
      origin: targetUrl.origin,
      title,
      capturedAt,
      capturedBy,
      baselineKind: "reference-budget",
      observedWebMCPTools,
    },
    incident: {
      id: sessionId,
      title: symptom,
      severity,
      startedAt: capturedAt,
      affectedServices: Object.values(currentServices)
        .filter((service) => service.health !== "healthy")
        .map((service) => service.serviceId),
      customerImpact,
    },
    services: currentServices,
    baselineServices,
    topology: {
      "page-runtime": ["browser-network"],
      "browser-network": [],
    },
    topologyLayout: {
      "page-runtime": { x: 12, y: 36 },
      "browser-network": { x: 62, y: 36 },
    },
    flows: {
      "page-session": {
        id: "page-session",
        label: "Captured user session",
        primaryPath: ["page-runtime", "browser-network"],
        branches: [],
      },
    },
    changes: [],
    evidence,
    mitigationCandidates,
    mitigationEffects,
    configTargetServiceId: "page-runtime",
    systemConfig: {
      targetOrigin: targetUrl.origin,
      observedToolCount: observedWebMCPTools.length,
      captureMethod: capturedBy,
    },
    baselineConfig: {
      targetOrigin: targetUrl.origin,
      observedToolCount: observedWebMCPTools.length,
      captureMethod: capturedBy,
    },
    recoveryThresholds: [
      {
        serviceId: "page-runtime",
        metric: "p95LatencyMs",
        operator: "lte",
        threshold: firstCandidate.predictedP95Ms,
      },
      {
        serviceId: "page-runtime",
        metric: "errorRatePct",
        operator: "lte",
        threshold: firstCandidate.predictedErrorRatePct,
      },
    ],
    timeline: [
      {
        id: "EVT-001",
        timestamp: capturedAt,
        actor: "system",
        type: "incident",
        title: "Live site captured",
        detail: `${title} was captured from ${targetUrl.origin}. Target content is untrusted evidence, and no site action was invoked.`,
      },
    ],
  };
};

const parseArguments = (argv) => {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!new Set(["--input", "--output"]).has(flag) || value === undefined) {
      fail("usage: --input <capture.json> --output <incident-pack.json>");
    }
    result[flag.slice(2)] = value;
  }
  if (!result.input || !result.output) {
    fail("usage: --input <capture.json> --output <incident-pack.json>");
  }
  return result;
};

const main = async () => {
  const args = parseArguments(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const input = await readFile(inputPath);
  if (input.byteLength > MAX_INPUT_BYTES) fail("input must be 1 MB or smaller");
  let capture;
  try {
    capture = JSON.parse(input.toString("utf8"));
  } catch {
    fail("input must contain valid JSON");
  }
  const pack = buildIncidentPack(capture);
  await writeFile(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({ ok: true, output: outputPath, packId: pack.packId })}\n`,
  );
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
