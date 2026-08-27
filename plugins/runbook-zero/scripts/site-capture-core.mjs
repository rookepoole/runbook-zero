/* global URL */

import { createHash } from "node:crypto";

const METHODS = new Set(["codex-browser-extension", "codex-browser", "manual"]);
const SEVERITIES = new Set(["SEV-1", "SEV-2", "SEV-3"]);
const HEALTH = new Set(["healthy", "degraded", "critical"]);
const CONFIDENCE = new Set(["low", "medium", "high"]);
const COMPONENT_KINDS = new Set([
  "page",
  "frontend",
  "api",
  "worker",
  "queue",
  "cache",
  "database",
  "external",
  "browser",
  "unknown",
]);
const EVIDENCE_KINDS = new Set([
  "telemetry",
  "change",
  "trace",
  "configuration",
  "browser",
  "webmcp",
]);
const CHANGE_CATEGORIES = new Set(["deploy", "config", "feature-flag"]);
const RESERVED_EVIDENCE = new Set(["E-SITE-CAPTURE", "E-WEBMCP-SURFACE"]);

export const rejectCapture = (message) => {
  throw new Error(`Site Capture rejected: ${message}`);
};

const object = (value, path) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    rejectCapture(`${path} must be an object`);
  }
  return value;
};
const string = (value, path, max = 700) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    rejectCapture(`${path} must be a non-empty string`);
  }
  if (value.length > max)
    rejectCapture(`${path} must be at most ${max} characters`);
  return value.trim();
};
const id = (value, path, max = 80) => {
  const result = string(value, path, max);
  if (!/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(result)) {
    rejectCapture(`${path} contains unsupported identifier characters`);
  }
  return result;
};
const number = (value, fallback, path) => {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    rejectCapture(`${path} must be a finite non-negative number`);
  }
  return value;
};
const requiredNumber = (value, path) => {
  if (value === undefined) rejectCapture(`${path} is required`);
  return number(value, 0, path);
};
const array = (value, path, max = 100, min = 0) => {
  if (value === undefined && min === 0) return [];
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    rejectCapture(`${path} must contain between ${min} and ${max} items`);
  }
  return value;
};
const choice = (value, allowed, path, fallback) => {
  const result = value ?? fallback;
  if (!allowed.has(result)) rejectCapture(`${path} is invalid`);
  return result;
};
const timestamp = (value, path) => {
  const result = string(value, path, 64);
  if (Number.isNaN(Date.parse(result)))
    rejectCapture(`${path} must be an ISO timestamp`);
  return new Date(result).toISOString();
};
const url = (value, path) => {
  let result;
  try {
    result = new URL(string(value, path, 2_000));
  } catch {
    rejectCapture(`${path} must be an absolute URL`);
  }
  if (!new Set(["http:", "https:"]).has(result.protocol)) {
    rejectCapture(`${path} must use http or https`);
  }
  return result;
};
const primitive = (value, path) => {
  if (
    value !== null &&
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    rejectCapture(`${path} must be a primitive value`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    rejectCapture(`${path} must be finite`);
  }
  return value;
};
const jsonValue = (value, path, depth = 0) => {
  if (depth > 8) rejectCapture(`${path} exceeds 8 nesting levels`);
  if (value === null || ["string", "boolean"].includes(typeof value))
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 100) rejectCapture(`${path} has too many array items`);
    return value.map((item, index) =>
      jsonValue(item, `${path}[${index}]`, depth + 1),
    );
  }
  const input = object(value, path);
  if (Object.keys(input).length > 100)
    rejectCapture(`${path} has too many keys`);
  return Object.fromEntries(
    Object.entries(input).map(([key, item]) => [
      string(key, `${path} key`, 120),
      jsonValue(item, `${path}.${key}`, depth + 1),
    ]),
  );
};
const safeId = (value, fallback) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || fallback;
const unique = (values, path) => {
  const result = new Set();
  values.forEach((value) => {
    if (result.has(value)) rejectCapture(`${path} contains duplicate ${value}`);
    result.add(value);
  });
  return result;
};
const references = (value, path, allowed, min = 1, max = 24) => {
  const values = array(value, path, max, min).map((item, index) =>
    id(item, `${path}[${index}]`),
  );
  unique(values, path);
  values.forEach((item, index) => {
    if (!allowed.has(item))
      rejectCapture(`${path}[${index}] references unknown ${item}`);
  });
  return values;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, precision = 0) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};
const telemetry = (serviceId, values, capturedAt) => ({
  serviceId,
  health: values.health,
  p50LatencyMs: round(values.p50LatencyMs),
  p95LatencyMs: round(values.p95LatencyMs),
  errorRatePct: round(values.errorRatePct, 1),
  requestsPerSecond: round(values.requestsPerSecond, 1),
  saturationPct: round(values.saturationPct),
  timestamp: capturedAt,
});

const parseSignals = (capture) => {
  const input = object(capture.signals ?? {}, "signals");
  const pageLoadMs = number(input.pageLoadMs, 1500, "signals.pageLoadMs");
  const resourceP95Ms = number(
    input.resourceP95Ms,
    Math.max(500, pageLoadMs * 0.5),
    "signals.resourceP95Ms",
  );
  const failedRequests = number(
    input.failedRequests,
    0,
    "signals.failedRequests",
  );
  const resourceCount = Math.max(
    1,
    number(input.resourceCount, 1, "signals.resourceCount"),
  );
  const consoleErrorCount = number(
    input.consoleErrorCount,
    0,
    "signals.consoleErrorCount",
  );
  const interactiveElementCount = number(
    input.interactiveElementCount,
    1,
    "signals.interactiveElementCount",
  );
  return {
    pageLoadMs,
    resourceP95Ms,
    failedRequests,
    resourceCount,
    interactiveElementCount,
    pageErrorRate: clamp(consoleErrorCount * 2, 0, 100),
    networkErrorRate: (failedRequests / resourceCount) * 100,
  };
};

const parseTools = (capture) => {
  const names = new Set();
  const tools = array(capture.webMcpTools, "webMcpTools").map(
    (value, index) => {
      const path = `webMcpTools[${index}]`;
      const input = object(value, path);
      const name = string(input.name, `${path}.name`, 160);
      if (names.has(name)) rejectCapture(`${path}.name duplicates ${name}`);
      names.add(name);
      if (typeof input.readOnly !== "boolean")
        rejectCapture(`${path}.readOnly must be boolean`);
      if (typeof input.destructive !== "boolean")
        rejectCapture(`${path}.destructive must be boolean`);
      return {
        name,
        ...(input.title === undefined
          ? {}
          : { title: string(input.title, `${path}.title`, 240) }),
        ...(input.description === undefined
          ? {}
          : {
              description: string(
                input.description,
                `${path}.description`,
                700,
              ),
            }),
        readOnly: input.readOnly,
        destructive: input.destructive,
      };
    },
  );
  return { tools, names };
};

const layoutGraph = (serviceIds, topology) => {
  const indegree = Object.fromEntries(
    serviceIds.map((serviceId) => [serviceId, 0]),
  );
  Object.values(topology).forEach((downstreams) =>
    downstreams.forEach((downstream) => {
      indegree[downstream] += 1;
    }),
  );
  const levels = Object.fromEntries(
    serviceIds.map((serviceId) => [serviceId, 0]),
  );
  const queue = serviceIds
    .filter((serviceId) => indegree[serviceId] === 0)
    .sort();
  const visited = new Set();
  while (queue.length > 0) {
    const serviceId = queue.shift();
    visited.add(serviceId);
    topology[serviceId].forEach((downstream) => {
      levels[downstream] = Math.max(levels[downstream], levels[serviceId] + 1);
      indegree[downstream] -= 1;
      if (indegree[downstream] === 0) {
        queue.push(downstream);
        queue.sort();
      }
    });
  }
  const acyclicMaximum = Math.max(0, ...Object.values(levels));
  serviceIds
    .filter((serviceId) => !visited.has(serviceId))
    .sort()
    .forEach((serviceId) => {
      levels[serviceId] = acyclicMaximum + 1;
    });
  const maximum = Math.max(1, ...Object.values(levels));
  const groups = new Map();
  serviceIds
    .slice()
    .sort()
    .forEach((serviceId) => {
      const level = levels[serviceId];
      groups.set(level, [...(groups.get(level) ?? []), serviceId]);
    });
  const result = {};
  groups.forEach((ids, level) => {
    ids.forEach((serviceId, index) => {
      result[serviceId] = {
        x: round(4 + (level / maximum) * 72, 1),
        y: round(
          ids.length === 1 ? 38 : 4 + (index / (ids.length - 1)) * 70,
          1,
        ),
      };
    });
  });
  return result;
};

const parseTelemetry = (
  value,
  path,
  health,
  kind,
  signals,
  baseline = false,
) => {
  const input = object(value ?? {}, path);
  const pageLike = new Set(["page", "frontend", "browser"]).has(kind);
  const observedP95 = pageLike ? signals.pageLoadMs : signals.resourceP95Ms;
  const budgetP95 = pageLike ? 1500 : 800;
  const p95Default = baseline
    ? budgetP95
    : health === "critical"
      ? Math.max(observedP95, budgetP95 * 1.8)
      : health === "degraded"
        ? Math.max(observedP95, budgetP95 * 1.2)
        : Math.min(observedP95, budgetP95);
  const p95LatencyMs = number(
    input.p95LatencyMs,
    p95Default,
    `${path}.p95LatencyMs`,
  );
  return {
    health: baseline ? "healthy" : health,
    p50LatencyMs: number(
      input.p50LatencyMs,
      p95LatencyMs * 0.55,
      `${path}.p50LatencyMs`,
    ),
    p95LatencyMs,
    errorRatePct: number(
      input.errorRatePct,
      baseline
        ? 0
        : pageLike
          ? signals.pageErrorRate
          : signals.networkErrorRate,
      `${path}.errorRatePct`,
    ),
    requestsPerSecond: number(
      input.requestsPerSecond,
      pageLike
        ? signals.interactiveElementCount
        : signals.resourceCount / Math.max(signals.pageLoadMs / 1000, 1),
      `${path}.requestsPerSecond`,
    ),
    saturationPct: number(
      input.saturationPct,
      baseline
        ? 45
        : health === "critical"
          ? 90
          : health === "degraded"
            ? 72
            : 45,
      `${path}.saturationPct`,
    ),
  };
};

const buildLegacyModel = ({
  capture,
  signals,
  capturedAt,
  title,
  targetUrl,
}) => {
  const evidence = array(capture.evidence, "evidence").map((value, index) => {
    const path = `evidence[${index}]`;
    const input = object(value, path);
    const surface = choice(
      input.surface,
      new Set(["page-runtime", "browser-network"]),
      `${path}.surface`,
      "page-runtime",
    );
    return {
      id: safeId(string(input.id, `${path}.id`, 120), `E-${index + 1}`),
      kind: choice(
        input.kind,
        new Set(["browser", "webmcp"]),
        `${path}.kind`,
        "browser",
      ),
      summary: string(input.summary, `${path}.summary`, 500),
      serviceIds: [surface],
    };
  });
  unique(
    evidence.map((item) => item.id),
    "evidence",
  );
  const services = {
    "page-runtime": telemetry(
      "page-runtime",
      {
        health:
          signals.pageLoadMs > 2500 || signals.pageErrorRate > 5
            ? "critical"
            : "degraded",
        p50LatencyMs: signals.pageLoadMs * 0.55,
        p95LatencyMs: signals.pageLoadMs,
        errorRatePct: signals.pageErrorRate,
        requestsPerSecond: signals.interactiveElementCount,
        saturationPct: clamp((signals.pageLoadMs / 2500) * 100, 0, 100),
      },
      capturedAt,
    ),
    "browser-network": telemetry(
      "browser-network",
      {
        health:
          signals.failedRequests > 0 || signals.resourceP95Ms > 1000
            ? "degraded"
            : "healthy",
        p50LatencyMs: signals.resourceP95Ms * 0.55,
        p95LatencyMs: signals.resourceP95Ms,
        errorRatePct: signals.networkErrorRate,
        requestsPerSecond:
          signals.resourceCount / Math.max(signals.pageLoadMs / 1000, 1),
        saturationPct: clamp((signals.resourceP95Ms / 1200) * 100, 0, 100),
      },
      capturedAt,
    ),
  };
  const baselineServices = {
    "page-runtime": telemetry(
      "page-runtime",
      {
        health: "healthy",
        p50LatencyMs: 700,
        p95LatencyMs: 1500,
        errorRatePct: 0,
        requestsPerSecond: signals.interactiveElementCount,
        saturationPct: 50,
      },
      capturedAt,
    ),
    "browser-network": telemetry(
      "browser-network",
      {
        health: "healthy",
        p50LatencyMs: 250,
        p95LatencyMs: 500,
        errorRatePct: 0,
        requestsPerSecond:
          signals.resourceCount / Math.max(signals.pageLoadMs / 1000, 1),
        saturationPct: 40,
      },
      capturedAt,
    ),
  };
  return {
    baselineKind: "reference-budget",
    services,
    baselineServices,
    serviceIds: ["page-runtime", "browser-network"],
    topology: { "page-runtime": ["browser-network"], "browser-network": [] },
    topologyLayout: {
      "page-runtime": { x: 12, y: 36 },
      "browser-network": { x: 62, y: 36 },
    },
    topologyTitle: "Captured browser surfaces",
    flows: {
      "page-session": {
        id: "page-session",
        label: "Captured user session",
        primaryPath: ["page-runtime", "browser-network"],
        branches: [],
      },
    },
    defaultFlow: "page-session",
    defaultServiceId: "page-runtime",
    impactPath: `${targetUrl.host} → browser session`,
    evidence,
    changes: [],
    components: [
      {
        id: "page-runtime",
        label: title,
        kind: "page",
        confidence: "low",
        evidenceIds: evidence
          .filter((item) => item.serviceIds.includes("page-runtime"))
          .map((item) => item.id),
      },
      {
        id: "browser-network",
        label: "Browser network",
        kind: "browser",
        confidence: "low",
        evidenceIds: evidence
          .filter((item) => item.serviceIds.includes("browser-network"))
          .map((item) => item.id),
      },
    ],
  };
};

const buildEvidenceModel = ({ capture, signals, capturedAt, title }) => {
  const baselineKind = choice(
    capture.baselineKind,
    new Set(["reference-budget", "measured-baseline"]),
    "baselineKind",
    "reference-budget",
  );
  const componentInputs = array(capture.components, "components", 24, 2);
  const componentIds = componentInputs.map((value, index) =>
    id(object(value, `components[${index}]`).id, `components[${index}].id`),
  );
  const componentSet = unique(componentIds, "components");
  const services = {};
  const baselineServices = {};
  const componentBase = componentInputs.map((value, index) => {
    const path = `components[${index}]`;
    const input = object(value, path);
    const serviceId = componentIds[index];
    const health = choice(input.health, HEALTH, `${path}.health`);
    const kind = choice(input.kind, COMPONENT_KINDS, `${path}.kind`, "unknown");
    const confidence = choice(
      input.confidence,
      CONFIDENCE,
      `${path}.confidence`,
      "medium",
    );
    if (baselineKind === "measured-baseline") {
      if (input.baseline === undefined) {
        rejectCapture(`${path}.baseline is required for a measured baseline`);
      }
      const measuredBaseline = object(input.baseline, `${path}.baseline`);
      if (measuredBaseline.p95LatencyMs === undefined) {
        rejectCapture(
          `${path}.baseline.p95LatencyMs is required for a measured baseline`,
        );
      }
    }
    services[serviceId] = telemetry(
      serviceId,
      parseTelemetry(
        input.telemetry,
        `${path}.telemetry`,
        health,
        kind,
        signals,
      ),
      capturedAt,
    );
    baselineServices[serviceId] = telemetry(
      serviceId,
      parseTelemetry(
        input.baseline,
        `${path}.baseline`,
        "healthy",
        kind,
        signals,
        true,
      ),
      capturedAt,
    );
    return {
      id: serviceId,
      label: string(input.label, `${path}.label`, 120),
      kind,
      confidence,
    };
  });

  const evidenceInputs = array(capture.evidence, "evidence", 100, 1);
  const evidenceIds = evidenceInputs.map((value, index) => {
    const evidenceId = id(
      object(value, `evidence[${index}]`).id,
      `evidence[${index}].id`,
      120,
    );
    if (RESERVED_EVIDENCE.has(evidenceId))
      rejectCapture(`evidence[${index}].id is reserved`);
    return evidenceId;
  });
  const evidenceSet = unique(evidenceIds, "evidence");
  const evidence = evidenceInputs.map((value, index) => {
    const path = `evidence[${index}]`;
    const input = object(value, path);
    return {
      id: evidenceIds[index],
      kind: choice(input.kind, EVIDENCE_KINDS, `${path}.kind`),
      summary: string(input.summary, `${path}.summary`, 500),
      serviceIds: references(
        input.componentIds,
        `${path}.componentIds`,
        componentSet,
      ),
    };
  });

  const topology = Object.fromEntries(
    componentIds.map((serviceId) => [serviceId, []]),
  );
  const edgeSet = new Set();
  const dependencies = array(capture.dependencies, "dependencies", 64, 1).map(
    (value, index) => {
      const path = `dependencies[${index}]`;
      const input = object(value, path);
      const from = id(input.from, `${path}.from`);
      const to = id(input.to, `${path}.to`);
      if (!componentSet.has(from))
        rejectCapture(`${path}.from references unknown ${from}`);
      if (!componentSet.has(to))
        rejectCapture(`${path}.to references unknown ${to}`);
      if (from === to) rejectCapture(`${path} cannot be a self dependency`);
      const edgeId = `${from}->${to}`;
      if (edgeSet.has(edgeId)) rejectCapture(`${path} duplicates ${edgeId}`);
      edgeSet.add(edgeId);
      topology[from].push(to);
      return {
        from,
        to,
        confidence: choice(
          input.confidence,
          CONFIDENCE,
          `${path}.confidence`,
          "medium",
        ),
        evidenceIds: references(
          input.evidenceIds,
          `${path}.evidenceIds`,
          evidenceSet,
        ),
      };
    },
  );
  Object.values(topology).forEach((downstreams) => downstreams.sort());

  const connectedPath = (pathIds, path) => {
    for (let index = 0; index < pathIds.length - 1; index += 1) {
      if (!edgeSet.has(`${pathIds[index]}->${pathIds[index + 1]}`)) {
        rejectCapture(
          `${path} contains an unevidenced edge ${pathIds[index]} -> ${pathIds[index + 1]}`,
        );
      }
    }
  };
  const flowInputs = array(capture.flows, "flows", 12, 1);
  const flowIds = flowInputs.map((value, index) =>
    id(object(value, `flows[${index}]`).id, `flows[${index}].id`),
  );
  unique(flowIds, "flows");
  const flows = Object.fromEntries(
    flowInputs.map((value, index) => {
      const path = `flows[${index}]`;
      const input = object(value, path);
      const primaryPath = references(
        input.primaryPath,
        `${path}.primaryPath`,
        componentSet,
        2,
      );
      connectedPath(primaryPath, `${path}.primaryPath`);
      const branches = array(input.branches, `${path}.branches`, 12).map(
        (branch, branchIndex) => {
          const result = references(
            branch,
            `${path}.branches[${branchIndex}]`,
            componentSet,
            2,
          );
          connectedPath(result, `${path}.branches[${branchIndex}]`);
          return result;
        },
      );
      return [
        flowIds[index],
        {
          id: flowIds[index],
          label: string(input.label, `${path}.label`, 160),
          primaryPath,
          branches,
        },
      ];
    }),
  );

  const changes = array(capture.changes, "changes", 30).map((value, index) => {
    const path = `changes[${index}]`;
    const input = object(value, path);
    const serviceId = id(input.componentId, `${path}.componentId`);
    if (!componentSet.has(serviceId))
      rejectCapture(`${path}.componentId references unknown ${serviceId}`);
    const diffInput = object(input.diff, `${path}.diff`);
    if (Object.keys(diffInput).length === 0)
      rejectCapture(`${path}.diff must not be empty`);
    return {
      id: id(input.id, `${path}.id`),
      timestamp: timestamp(input.timestamp, `${path}.timestamp`),
      serviceId,
      category: choice(input.category, CHANGE_CATEGORIES, `${path}.category`),
      summary: string(input.summary, `${path}.summary`, 500),
      ...(input.version === undefined
        ? {}
        : { version: string(input.version, `${path}.version`, 120) }),
      author: string(input.author, `${path}.author`, 120),
      risk: choice(input.risk, CONFIDENCE, `${path}.risk`),
      diff: Object.fromEntries(
        Object.entries(diffInput).map(([key, diffValue]) => {
          const pair = object(diffValue, `${path}.diff.${key}`);
          return [
            string(key, `${path}.diff key`, 120),
            {
              from: primitive(pair.from, `${path}.diff.${key}.from`),
              to: primitive(pair.to, `${path}.diff.${key}.to`),
            },
          ];
        }),
      ),
    };
  });
  unique(
    changes.map((change) => change.id),
    "changes",
  );

  const diagnosisInput = object(capture.diagnosis, "diagnosis");
  const diagnosis = {
    summary: string(diagnosisInput.summary, "diagnosis.summary", 700),
    confidence: choice(
      diagnosisInput.confidence,
      CONFIDENCE,
      "diagnosis.confidence",
    ),
    evidenceIds: references(
      diagnosisInput.evidenceIds,
      "diagnosis.evidenceIds",
      evidenceSet,
    ),
    serviceIds: references(
      diagnosisInput.componentIds,
      "diagnosis.componentIds",
      componentSet,
    ),
  };
  const evidenceByComponent = new Map(
    componentIds.map((serviceId) => [serviceId, new Set()]),
  );
  evidence.forEach((item) =>
    item.serviceIds.forEach((serviceId) =>
      evidenceByComponent.get(serviceId).add(item.id),
    ),
  );
  dependencies.forEach((dependency) =>
    dependency.evidenceIds.forEach((evidenceId) => {
      evidenceByComponent.get(dependency.from).add(evidenceId);
      evidenceByComponent.get(dependency.to).add(evidenceId);
    }),
  );
  const components = componentBase.map((component) => ({
    ...component,
    evidenceIds: [...evidenceByComponent.get(component.id)].sort(),
  }));
  const defaultFlow = flowIds[0];
  return {
    baselineKind,
    services,
    baselineServices,
    serviceIds: componentIds,
    topology,
    topologyLayout: layoutGraph(componentIds, topology),
    topologyTitle: `${title} evidence-derived dependency graph`,
    flows,
    defaultFlow,
    defaultServiceId: diagnosis.serviceIds[0],
    impactPath: flows[defaultFlow].primaryPath
      .map(
        (serviceId) =>
          components.find((component) => component.id === serviceId).label,
      )
      .join(" → "),
    evidence,
    changes,
    components,
    diagnosis,
  };
};

const buildCandidates = ({
  capture,
  schemaVersion,
  targetUrl,
  toolNames,
  model,
}) => {
  const serviceSet = new Set(model.serviceIds);
  const candidateInputs = array(
    capture.candidateActions,
    "candidateActions",
    12,
  );
  const operatorInstructions = array(
    capture.operatorHandoff,
    "operatorHandoff",
    12,
  ).map((step, index) => string(step, `operatorHandoff[${index}]`, 500));
  if (candidateInputs.length === 0 && operatorInstructions.length === 0) {
    operatorInstructions.push(
      "Review the captured evidence and select a site-owned remediation path before making a change.",
    );
  }
  const candidates = {};
  const effects = {};
  const add = (candidate) => {
    if (candidates[candidate.id])
      rejectCapture(`candidateActions contains duplicate ${candidate.id}`);
    candidates[candidate.id] = candidate;
    effects[candidate.id] = {
      resultingConfig: {
        targetOrigin: targetUrl.origin,
        executionMode: candidate.execution.mode,
      },
      recoveryFrames: [],
    };
  };
  candidateInputs.forEach((value, index) => {
    const path = `candidateActions[${index}]`;
    const input = object(value, path);
    const webMcp = object(input.webMcp, `${path}.webMcp`);
    const toolName = string(webMcp.toolName, `${path}.webMcp.toolName`, 160);
    if (!toolNames.has(toolName))
      rejectCapture(`${path} names unobserved WebMCP tool ${toolName}`);
    const toolInput = jsonValue(webMcp.input ?? {}, `${path}.webMcp.input`);
    if (
      toolInput === null ||
      Array.isArray(toolInput) ||
      typeof toolInput !== "object"
    ) {
      rejectCapture(`${path}.webMcp.input must be an object`);
    }
    const targetService =
      schemaVersion === 2
        ? id(input.targetComponentId, `${path}.targetComponentId`)
        : (input.targetSurface ?? "page-runtime");
    if (!serviceSet.has(targetService))
      rejectCapture(`${path} references unknown target ${targetService}`);
    if (typeof input.reversible !== "boolean")
      rejectCapture(`${path}.reversible must be boolean`);
    const expected = object(input.expected ?? {}, `${path}.expected`);
    const assumptions = array(input.assumptions, `${path}.assumptions`, 12).map(
      (item, itemIndex) =>
        string(item, `${path}.assumptions[${itemIndex}]`, 500),
    );
    if (assumptions.length === 0) {
      assumptions.push(
        "The target tool remains registered with the same schema after approval.",
        "Fresh read-only evidence can verify the result.",
      );
    }
    add({
      id: safeId(string(input.id, `${path}.id`, 100), `M-SITE-${index + 1}`),
      kind: "site-action",
      title: string(input.title, `${path}.title`, 200),
      targetService,
      description: string(input.description, `${path}.description`, 700),
      exactActions: [
        {
          targetService,
          field: `webmcp:${toolName}`,
          from: "not invoked",
          to: JSON.stringify(toolInput),
        },
      ],
      predictedP95Ms: number(
        expected.p95LatencyMs ?? expected.pageLoadMs,
        model.baselineServices[targetService].p95LatencyMs,
        `${path}.expected.p95LatencyMs`,
      ),
      predictedErrorRatePct: number(
        expected.errorRatePct,
        model.baselineServices[targetService].errorRatePct,
        `${path}.expected.errorRatePct`,
      ),
      estimatedRecoverySeconds: number(
        input.estimatedRecoverySeconds,
        60,
        `${path}.estimatedRecoverySeconds`,
      ),
      risk: choice(input.risk, CONFIDENCE, `${path}.risk`, "medium"),
      reversible: input.reversible,
      assumptions,
      execution: {
        mode: "external-webmcp",
        targetOrigin: targetUrl.origin,
        toolName,
        input: toolInput,
      },
    });
  });
  if (operatorInstructions.length > 0) {
    add({
      id: "M-OPERATOR-HANDOFF",
      kind: "operator-handoff",
      title: "Release an operator handoff",
      targetService: model.defaultServiceId,
      description:
        "Preserve the evidence and give the operator an exact site-owned runbook. Runbook Zero will not claim that the site was changed automatically.",
      exactActions: [
        {
          targetService: model.defaultServiceId,
          field: "operator-handoff",
          from: "not authorized",
          to: `${operatorInstructions.length} approved step${operatorInstructions.length === 1 ? "" : "s"}`,
        },
      ],
      predictedP95Ms:
        model.baselineServices[model.defaultServiceId].p95LatencyMs,
      predictedErrorRatePct:
        model.baselineServices[model.defaultServiceId].errorRatePct,
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
  return { candidates, effects };
};

const recoveryThresholds = (capture, model, firstCandidate) => {
  if (capture.schemaVersion !== 2 || capture.recoveryThresholds === undefined) {
    return [
      {
        serviceId: firstCandidate.targetService,
        metric: "p95LatencyMs",
        operator: "lte",
        threshold: firstCandidate.predictedP95Ms,
      },
      {
        serviceId: firstCandidate.targetService,
        metric: "errorRatePct",
        operator: "lte",
        threshold: firstCandidate.predictedErrorRatePct,
      },
    ];
  }
  const serviceSet = new Set(model.serviceIds);
  const metrics = new Set([
    "p50LatencyMs",
    "p95LatencyMs",
    "errorRatePct",
    "requestsPerSecond",
    "saturationPct",
  ]);
  return array(capture.recoveryThresholds, "recoveryThresholds", 12, 1).map(
    (value, index) => {
      const path = `recoveryThresholds[${index}]`;
      const input = object(value, path);
      const serviceId = id(input.componentId, `${path}.componentId`);
      if (!serviceSet.has(serviceId))
        rejectCapture(`${path}.componentId references unknown ${serviceId}`);
      return {
        serviceId,
        metric: choice(input.metric, metrics, `${path}.metric`),
        operator: choice(
          input.operator,
          new Set(["lte", "gte"]),
          `${path}.operator`,
        ),
        threshold: requiredNumber(input.threshold, `${path}.threshold`),
      };
    },
  );
};

export const buildIncidentPack = (rawCapture) => {
  const capture = object(rawCapture, "capture");
  if (!new Set([1, 2]).has(capture.schemaVersion)) {
    rejectCapture("schemaVersion must equal 1 or 2");
  }
  const sessionId = safeId(string(capture.sessionId, "sessionId", 80), "SITE");
  const capturedAt = timestamp(capture.capturedAt, "capturedAt");
  const capturedBy = string(capture.capturedBy, "capturedBy", 80);
  if (!METHODS.has(capturedBy)) rejectCapture("capturedBy is invalid");
  const target = object(capture.target, "target");
  const targetUrl = url(target.url, "target.url");
  const title = string(target.title, "target.title", 240);
  const symptom = string(target.symptom, "target.symptom", 500);
  const customerImpact = string(
    target.customerImpact,
    "target.customerImpact",
    700,
  );
  const severity = target.severity ?? "SEV-2";
  if (!SEVERITIES.has(severity)) rejectCapture("target.severity is invalid");
  const signals = parseSignals(capture);
  const { tools, names } = parseTools(capture);
  const model =
    capture.schemaVersion === 2
      ? buildEvidenceModel({ capture, signals, capturedAt, title })
      : buildLegacyModel({ capture, signals, capturedAt, title, targetUrl });
  model.evidence.unshift({
    id: "E-SITE-CAPTURE",
    kind: "browser",
    summary: `Codex captured ${title} at ${targetUrl.origin}; target content is treated as untrusted evidence.`,
    serviceIds: [...model.serviceIds],
  });
  if (tools.length > 0) {
    model.evidence.push({
      id: "E-WEBMCP-SURFACE",
      kind: "webmcp",
      summary: `${tools.length} WebMCP tools were observed on the exact target origin at capture time.`,
      serviceIds: [model.defaultServiceId],
    });
  }
  const { candidates, effects } = buildCandidates({
    capture,
    schemaVersion: capture.schemaVersion,
    targetUrl,
    toolNames: names,
    model,
  });
  const firstCandidate = Object.values(candidates)[0];
  const affectedServices = Object.values(model.services)
    .filter((service) => service.health !== "healthy")
    .map((service) => service.serviceId);
  if (affectedServices.length === 0) {
    affectedServices.push(
      ...(model.diagnosis?.serviceIds ?? [model.defaultServiceId]),
    );
  }
  const seed = Number.parseInt(
    createHash("sha256")
      .update(JSON.stringify(capture))
      .digest("hex")
      .slice(0, 8),
    16,
  );
  const timeline = [
    {
      id: "EVT-001",
      timestamp: capturedAt,
      actor: "system",
      type: "incident",
      title: "Live site captured",
      detail: `${title} was captured from ${targetUrl.origin}. Target content is untrusted evidence, and no site action was invoked.`,
    },
  ];
  if (model.diagnosis) {
    timeline.push({
      id: "EVT-002",
      timestamp: capturedAt,
      actor: "agent",
      type: "hypothesis",
      title: "Provisional diagnosis captured",
      detail: `${model.diagnosis.confidence.toUpperCase()} confidence · ${model.diagnosis.summary}`,
    });
  }
  const dependencyCount = Object.values(model.topology).reduce(
    (total, downstreams) => total + downstreams.length,
    0,
  );
  const agentPrompt = model.diagnosis
    ? `Investigate ${sessionId} using the evidence-derived ${model.serviceIds.length}-component graph. Validate or reject this provisional diagnosis: "${model.diagnosis.summary}" Begin read-only and do not stage or execute until the evidence is sufficient.`
    : "Investigate this live-site capture, explain the evidence boundary, compare the available exact actions, and stage one for my review. Do not execute it.";
  return {
    schemaVersion: 1,
    packId: `live-${sessionId.toLowerCase()}`,
    name: `${title} live incident`,
    summary: symptom,
    canonical: false,
    seed,
    agentPrompt,
    impactPath: model.impactPath,
    topologyTitle: model.topologyTitle,
    defaultServiceId: model.defaultServiceId,
    defaultFlow: model.defaultFlow,
    eventBaseTimestamp: capturedAt,
    recoveryTimestamp: new Date(Date.parse(capturedAt) + 60_000).toISOString(),
    source: {
      kind: "live-site",
      url: targetUrl.href,
      origin: targetUrl.origin,
      title,
      capturedAt,
      capturedBy,
      baselineKind: model.baselineKind,
      observedWebMCPTools: tools,
      captureSchemaVersion: capture.schemaVersion,
      topologyKind:
        capture.schemaVersion === 2 ? "evidence-derived" : "generic-browser",
      components: model.components,
      dependencyCount,
      flowCount: Object.keys(model.flows).length,
      ...(model.diagnosis ? { diagnosis: model.diagnosis } : {}),
    },
    incident: {
      id: sessionId,
      title: symptom,
      severity,
      startedAt: capturedAt,
      affectedServices,
      customerImpact,
    },
    services: model.services,
    baselineServices: model.baselineServices,
    topology: model.topology,
    topologyLayout: model.topologyLayout,
    flows: model.flows,
    changes: model.changes,
    evidence: model.evidence,
    mitigationCandidates: candidates,
    mitigationEffects: effects,
    configTargetServiceId: firstCandidate.targetService,
    systemConfig: {
      targetOrigin: targetUrl.origin,
      observedToolCount: tools.length,
      captureMethod: capturedBy,
      componentCount: model.serviceIds.length,
      dependencyCount,
    },
    baselineConfig: {
      targetOrigin: targetUrl.origin,
      observedToolCount: tools.length,
      captureMethod: capturedBy,
      componentCount: model.serviceIds.length,
      dependencyCount,
    },
    recoveryThresholds: recoveryThresholds(capture, model, firstCandidate),
    timeline,
  };
};
