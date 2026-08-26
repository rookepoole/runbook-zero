import type {
  IncidentPack,
  JsonValue,
  MitigationExecution,
  PrimitiveConfigValue,
  ServiceTelemetry,
} from "../domain/types";

const MAX_JSON_BYTES = 1_000_000;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export class IncidentPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncidentPackValidationError";
  }
}

const fail = (path: string, message: string): never => {
  throw new IncidentPackValidationError(`${path}: ${message}`);
};

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
};

const text = (value: unknown, path: string, max = 500): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fail(path, "must be a non-empty string");
  }
  if (value.length > max) {
    return fail(path, `must be at most ${max} characters`);
  }
  return value;
};

const finiteNumber = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "must be a finite number");
  }
  return value;
};

const list = (value: unknown, path: string, min = 0, max = 100): unknown[] => {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  if (value.length < min || value.length > max) {
    fail(path, `must contain between ${min} and ${max} items`);
  }
  return value;
};

const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(path, `must be one of ${allowed.join(", ")}`);
  }
  return value as T;
};

const timestamp = (value: unknown, path: string): string => {
  const result = text(value, path, 64);
  if (Number.isNaN(Date.parse(result))) fail(path, "must be an ISO timestamp");
  return result;
};

const primitive = (value: unknown, path: string): PrimitiveConfigValue => {
  if (
    value !== null &&
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    fail(path, "must be a string, number, boolean, or null");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    fail(path, "must be finite");
  }
  return value as PrimitiveConfigValue;
};

const jsonValue = (value: unknown, path: string, depth = 0): JsonValue => {
  if (depth > 8) fail(path, "must not exceed 8 levels of nesting");
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(path, "numbers must be finite");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) fail(path, "arrays must contain at most 100 items");
    return value.map((item, index) =>
      jsonValue(item, `${path}[${index}]`, depth + 1),
    );
  }
  const input = record(value, path);
  if (Object.keys(input).length > 100) {
    fail(path, "objects must contain at most 100 keys");
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, item]) => [
      text(key, `${path} key`, 120),
      jsonValue(item, `${path}.${key}`, depth + 1),
    ]),
  );
};

const webUrl = (value: unknown, path: string): URL => {
  const raw = text(value, path, 2_000);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return fail(path, "must be an absolute URL");
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    fail(path, "must use http or https");
  }
  return parsed;
};

const rejectUnsafeKeys = (value: unknown, path = "pack"): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectUnsafeKeys(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_KEYS.has(key))
      fail(`${path}.${key}`, "unsafe key is not allowed");
    rejectUnsafeKeys(child, `${path}.${key}`);
  }
};

const validateTelemetry = (
  value: unknown,
  serviceId: string,
  path: string,
): void => {
  const item = record(value, path);
  if (text(item.serviceId, `${path}.serviceId`, 80) !== serviceId) {
    fail(`${path}.serviceId`, "must match its record key");
  }
  enumValue(item.health, ["healthy", "degraded", "critical"], `${path}.health`);
  for (const metric of [
    "p50LatencyMs",
    "p95LatencyMs",
    "errorRatePct",
    "requestsPerSecond",
    "saturationPct",
  ] as const) {
    if (finiteNumber(item[metric], `${path}.${metric}`) < 0) {
      fail(`${path}.${metric}`, "must be non-negative");
    }
  }
  timestamp(item.timestamp, `${path}.timestamp`);
};

const validateConfig = (value: unknown, path: string): void => {
  for (const [key, configValue] of Object.entries(record(value, path))) {
    text(key, `${path} key`, 120);
    primitive(configValue, `${path}.${key}`);
  }
};

export const validateIncidentPack = (input: unknown): IncidentPack => {
  rejectUnsafeKeys(input);
  const pack = record(input, "pack");
  if (pack.schemaVersion !== 1) fail("pack.schemaVersion", "must equal 1");
  text(pack.packId, "pack.packId", 80);
  text(pack.name, "pack.name", 120);
  text(pack.summary, "pack.summary", 500);
  if (typeof pack.canonical !== "boolean")
    fail("pack.canonical", "must be boolean");
  if (!Number.isInteger(finiteNumber(pack.seed, "pack.seed"))) {
    fail("pack.seed", "must be an integer");
  }
  text(pack.agentPrompt, "pack.agentPrompt", 700);
  text(pack.impactPath, "pack.impactPath", 200);
  text(pack.topologyTitle, "pack.topologyTitle", 200);
  timestamp(pack.eventBaseTimestamp, "pack.eventBaseTimestamp");
  timestamp(pack.recoveryTimestamp, "pack.recoveryTimestamp");

  let liveOrigin: string | undefined;
  if (pack.source !== undefined) {
    const source = record(pack.source, "pack.source");
    const kind = enumValue(
      source.kind,
      ["bundled-simulation", "imported-simulation", "live-site"],
      "pack.source.kind",
    );
    if (kind === "live-site") {
      const targetUrl = webUrl(source.url, "pack.source.url");
      liveOrigin = webUrl(source.origin, "pack.source.origin").origin;
      if (targetUrl.origin !== liveOrigin || source.origin !== liveOrigin) {
        fail("pack.source.origin", "must exactly match the target URL origin");
      }
      text(source.title, "pack.source.title", 240);
      timestamp(source.capturedAt, "pack.source.capturedAt");
      enumValue(
        source.capturedBy,
        ["codex-browser-extension", "codex-browser", "manual"],
        "pack.source.capturedBy",
      );
      enumValue(
        source.baselineKind,
        ["reference-budget", "measured-baseline"],
        "pack.source.baselineKind",
      );
      list(
        source.observedWebMCPTools,
        "pack.source.observedWebMCPTools",
        0,
        100,
      ).forEach((toolValue, index) => {
        const path = `pack.source.observedWebMCPTools[${index}]`;
        const tool = record(toolValue, path);
        text(tool.name, `${path}.name`, 160);
        if (tool.title !== undefined) text(tool.title, `${path}.title`, 240);
        if (tool.description !== undefined) {
          text(tool.description, `${path}.description`, 700);
        }
        if (typeof tool.readOnly !== "boolean") {
          fail(`${path}.readOnly`, "must be boolean");
        }
        if (typeof tool.destructive !== "boolean") {
          fail(`${path}.destructive`, "must be boolean");
        }
      });
    } else {
      text(source.label, "pack.source.label", 240);
    }
  }

  const incident = record(pack.incident, "pack.incident");
  text(incident.id, "pack.incident.id", 80);
  text(incident.title, "pack.incident.title", 200);
  enumValue(
    incident.severity,
    ["SEV-1", "SEV-2", "SEV-3"],
    "pack.incident.severity",
  );
  timestamp(incident.startedAt, "pack.incident.startedAt");
  text(incident.customerImpact, "pack.incident.customerImpact", 700);

  const services = record(pack.services, "pack.services");
  const baselineServices = record(
    pack.baselineServices,
    "pack.baselineServices",
  );
  const serviceIds = Object.keys(services);
  if (serviceIds.length < 2 || serviceIds.length > 24) {
    fail("pack.services", "must contain between 2 and 24 services");
  }
  if (new Set(serviceIds).size !== serviceIds.length) {
    fail("pack.services", "service IDs must be unique");
  }
  for (const serviceId of serviceIds) {
    text(serviceId, "pack.services key", 80);
    validateTelemetry(
      services[serviceId],
      serviceId,
      `pack.services.${serviceId}`,
    );
    if (!(serviceId in baselineServices)) {
      fail(`pack.baselineServices.${serviceId}`, "baseline is required");
    }
    validateTelemetry(
      baselineServices[serviceId],
      serviceId,
      `pack.baselineServices.${serviceId}`,
    );
  }
  if (Object.keys(baselineServices).some((id) => !(id in services))) {
    fail("pack.baselineServices", "contains an unknown service");
  }
  const serviceSet = new Set(serviceIds);
  const affected = list(
    incident.affectedServices,
    "pack.incident.affectedServices",
    1,
    24,
  );
  affected.forEach((id, index) => {
    if (
      !serviceSet.has(text(id, `pack.incident.affectedServices[${index}]`, 80))
    ) {
      fail(
        `pack.incident.affectedServices[${index}]`,
        "references an unknown service",
      );
    }
  });

  const defaultServiceId = text(
    pack.defaultServiceId,
    "pack.defaultServiceId",
    80,
  );
  if (!serviceSet.has(defaultServiceId)) {
    fail("pack.defaultServiceId", "must reference a known service");
  }
  const configTargetServiceId = text(
    pack.configTargetServiceId,
    "pack.configTargetServiceId",
    80,
  );
  if (!serviceSet.has(configTargetServiceId)) {
    fail("pack.configTargetServiceId", "must reference a known service");
  }

  const topology = record(pack.topology, "pack.topology");
  const layout = record(pack.topologyLayout, "pack.topologyLayout");
  for (const serviceId of serviceIds) {
    const dependencies = list(
      topology[serviceId],
      `pack.topology.${serviceId}`,
      0,
      24,
    );
    dependencies.forEach((dependency, index) => {
      if (
        !serviceSet.has(
          text(dependency, `pack.topology.${serviceId}[${index}]`, 80),
        )
      ) {
        fail(
          `pack.topology.${serviceId}[${index}]`,
          "references an unknown service",
        );
      }
    });
    const position = record(
      layout[serviceId],
      `pack.topologyLayout.${serviceId}`,
    );
    const x = finiteNumber(position.x, `pack.topologyLayout.${serviceId}.x`);
    const y = finiteNumber(position.y, `pack.topologyLayout.${serviceId}.y`);
    if (x < 0 || x > 90 || y < 0 || y > 90) {
      fail(
        `pack.topologyLayout.${serviceId}`,
        "coordinates must be between 0 and 90",
      );
    }
  }

  const flows = record(pack.flows, "pack.flows");
  const flowIds = Object.keys(flows);
  if (flowIds.length < 1 || flowIds.length > 12) {
    fail("pack.flows", "must contain between 1 and 12 flows");
  }
  for (const flowId of flowIds) {
    const flow = record(flows[flowId], `pack.flows.${flowId}`);
    if (text(flow.id, `pack.flows.${flowId}.id`, 80) !== flowId) {
      fail(`pack.flows.${flowId}.id`, "must match its record key");
    }
    text(flow.label, `pack.flows.${flowId}.label`, 120);
    const paths = [
      ...list(flow.primaryPath, `pack.flows.${flowId}.primaryPath`, 2, 24),
      ...list(flow.branches, `pack.flows.${flowId}.branches`, 0, 24).flatMap(
        (branch, index) =>
          list(branch, `pack.flows.${flowId}.branches[${index}]`, 2, 24),
      ),
    ];
    paths.forEach((serviceId, index) => {
      if (
        !serviceSet.has(
          text(serviceId, `pack.flows.${flowId}.path[${index}]`, 80),
        )
      ) {
        fail(
          `pack.flows.${flowId}.path[${index}]`,
          "references an unknown service",
        );
      }
    });
  }
  const defaultFlow = text(pack.defaultFlow, "pack.defaultFlow", 80);
  if (!flowIds.includes(defaultFlow)) {
    fail("pack.defaultFlow", "must reference a known flow");
  }

  list(pack.changes, "pack.changes", 0, 20).forEach((changeValue, index) => {
    const path = `pack.changes[${index}]`;
    const change = record(changeValue, path);
    text(change.id, `${path}.id`, 80);
    timestamp(change.timestamp, `${path}.timestamp`);
    if (!serviceSet.has(text(change.serviceId, `${path}.serviceId`, 80))) {
      fail(`${path}.serviceId`, "references an unknown service");
    }
    enumValue(
      change.category,
      ["deploy", "config", "feature-flag"],
      `${path}.category`,
    );
    text(change.summary, `${path}.summary`, 500);
    if (change.version !== undefined)
      text(change.version, `${path}.version`, 120);
    text(change.author, `${path}.author`, 120);
    enumValue(change.risk, ["low", "medium", "high"], `${path}.risk`);
    const diff = record(change.diff, `${path}.diff`);
    if (Object.keys(diff).length === 0)
      fail(`${path}.diff`, "must not be empty");
    for (const [field, diffValue] of Object.entries(diff)) {
      const entry = record(diffValue, `${path}.diff.${field}`);
      primitive(entry.from, `${path}.diff.${field}.from`);
      primitive(entry.to, `${path}.diff.${field}.to`);
    }
  });

  list(pack.evidence, "pack.evidence", 1, 100).forEach(
    (evidenceValue, index) => {
      const path = `pack.evidence[${index}]`;
      const evidence = record(evidenceValue, path);
      text(evidence.id, `${path}.id`, 120);
      enumValue(
        evidence.kind,
        ["telemetry", "change", "trace", "configuration", "browser", "webmcp"],
        `${path}.kind`,
      );
      text(evidence.summary, `${path}.summary`, 500);
      list(evidence.serviceIds, `${path}.serviceIds`, 1, 24).forEach(
        (id, serviceIndex) => {
          if (
            !serviceSet.has(text(id, `${path}.serviceIds[${serviceIndex}]`, 80))
          ) {
            fail(
              `${path}.serviceIds[${serviceIndex}]`,
              "references an unknown service",
            );
          }
        },
      );
    },
  );

  const candidates = record(
    pack.mitigationCandidates,
    "pack.mitigationCandidates",
  );
  const effects = record(pack.mitigationEffects, "pack.mitigationEffects");
  const mitigationIds = Object.keys(candidates);
  if (mitigationIds.length < 1 || mitigationIds.length > 12) {
    fail(
      "pack.mitigationCandidates",
      "must contain between 1 and 12 candidates",
    );
  }
  for (const mitigationId of mitigationIds) {
    const path = `pack.mitigationCandidates.${mitigationId}`;
    const candidate = record(candidates[mitigationId], path);
    if (text(candidate.id, `${path}.id`, 100) !== mitigationId) {
      fail(`${path}.id`, "must match its record key");
    }
    enumValue(
      candidate.kind,
      [
        "rollback",
        "config-restore",
        "cache-degrade-mode",
        "traffic-shift",
        "capacity-adjustment",
        "site-action",
        "operator-handoff",
      ],
      `${path}.kind`,
    );
    text(candidate.title, `${path}.title`, 200);
    if (
      !serviceSet.has(
        text(candidate.targetService, `${path}.targetService`, 80),
      )
    ) {
      fail(`${path}.targetService`, "references an unknown service");
    }
    text(candidate.description, `${path}.description`, 700);
    finiteNumber(candidate.predictedP95Ms, `${path}.predictedP95Ms`);
    finiteNumber(
      candidate.predictedErrorRatePct,
      `${path}.predictedErrorRatePct`,
    );
    finiteNumber(
      candidate.estimatedRecoverySeconds,
      `${path}.estimatedRecoverySeconds`,
    );
    enumValue(candidate.risk, ["low", "medium", "high"], `${path}.risk`);
    if (typeof candidate.reversible !== "boolean")
      fail(`${path}.reversible`, "must be boolean");
    list(candidate.assumptions, `${path}.assumptions`, 1, 12).forEach(
      (item, index) => text(item, `${path}.assumptions[${index}]`, 500),
    );
    list(candidate.exactActions, `${path}.exactActions`, 1, 12).forEach(
      (actionValue, index) => {
        const actionPath = `${path}.exactActions[${index}]`;
        const action = record(actionValue, actionPath);
        if (
          !serviceSet.has(
            text(action.targetService, `${actionPath}.targetService`, 80),
          )
        ) {
          fail(`${actionPath}.targetService`, "references an unknown service");
        }
        text(action.field, `${actionPath}.field`, 120);
        primitive(action.from, `${actionPath}.from`);
        primitive(action.to, `${actionPath}.to`);
      },
    );

    let executionMode: MitigationExecution["mode"] = "simulation";
    if (candidate.execution !== undefined) {
      const execution = record(candidate.execution, `${path}.execution`);
      executionMode = enumValue(
        execution.mode,
        ["simulation", "external-webmcp", "operator-handoff"],
        `${path}.execution.mode`,
      );
      if (executionMode !== "simulation") {
        const targetOrigin = webUrl(
          execution.targetOrigin,
          `${path}.execution.targetOrigin`,
        ).origin;
        if (execution.targetOrigin !== targetOrigin) {
          fail(
            `${path}.execution.targetOrigin`,
            "must be an origin without a path",
          );
        }
        if (liveOrigin === undefined || targetOrigin !== liveOrigin) {
          fail(
            `${path}.execution.targetOrigin`,
            "must match the live-site source origin",
          );
        }
      }
      if (executionMode === "external-webmcp") {
        text(execution.toolName, `${path}.execution.toolName`, 160);
        jsonValue(execution.input, `${path}.execution.input`);
        const observedTools = list(
          record(pack.source, "pack.source").observedWebMCPTools,
          "pack.source.observedWebMCPTools",
          0,
          100,
        ).map((value, index) =>
          text(
            record(value, `pack.source.observedWebMCPTools[${index}]`).name,
            `pack.source.observedWebMCPTools[${index}].name`,
            160,
          ),
        );
        if (!observedTools.includes(execution.toolName as string)) {
          fail(
            `${path}.execution.toolName`,
            "must name a tool observed on the live target",
          );
        }
      }
      if (executionMode === "operator-handoff") {
        list(
          execution.instructions,
          `${path}.execution.instructions`,
          1,
          12,
        ).forEach((instruction, index) =>
          text(instruction, `${path}.execution.instructions[${index}]`, 500),
        );
      }
    }

    const effectValue = record(
      effects[mitigationId],
      `pack.mitigationEffects.${mitigationId}`,
    );
    validateConfig(
      effectValue.resultingConfig,
      `pack.mitigationEffects.${mitigationId}.resultingConfig`,
    );
    list(
      effectValue.recoveryFrames,
      `pack.mitigationEffects.${mitigationId}.recoveryFrames`,
      executionMode === "simulation" ? 1 : 0,
      10,
    ).forEach((frameValue, frameIndex) => {
      const framePath = `pack.mitigationEffects.${mitigationId}.recoveryFrames[${frameIndex}]`;
      const updates = record(
        record(frameValue, framePath).serviceUpdates,
        `${framePath}.serviceUpdates`,
      );
      if (Object.keys(updates).length === 0)
        fail(`${framePath}.serviceUpdates`, "must not be empty");
      for (const [serviceId, updateValue] of Object.entries(updates)) {
        if (!serviceSet.has(serviceId))
          fail(
            `${framePath}.serviceUpdates.${serviceId}`,
            "references an unknown service",
          );
        const update = record(
          updateValue,
          `${framePath}.serviceUpdates.${serviceId}`,
        );
        for (const [key, updateMetric] of Object.entries(update)) {
          if (key === "health") {
            enumValue(
              updateMetric,
              ["healthy", "degraded", "critical"],
              `${framePath}.${serviceId}.health`,
            );
          } else if (
            [
              "p50LatencyMs",
              "p95LatencyMs",
              "errorRatePct",
              "requestsPerSecond",
              "saturationPct",
            ].includes(key)
          ) {
            finiteNumber(updateMetric, `${framePath}.${serviceId}.${key}`);
          } else {
            fail(
              `${framePath}.${serviceId}.${key}`,
              "is not a supported telemetry field",
            );
          }
        }
      }
    });
  }
  if (Object.keys(effects).some((id) => !(id in candidates))) {
    fail("pack.mitigationEffects", "contains an unknown mitigation");
  }

  validateConfig(pack.systemConfig, "pack.systemConfig");
  validateConfig(pack.baselineConfig, "pack.baselineConfig");
  list(pack.recoveryThresholds, "pack.recoveryThresholds", 1, 12).forEach(
    (thresholdValue, index) => {
      const path = `pack.recoveryThresholds[${index}]`;
      const threshold = record(thresholdValue, path);
      if (!serviceSet.has(text(threshold.serviceId, `${path}.serviceId`, 80))) {
        fail(`${path}.serviceId`, "references an unknown service");
      }
      enumValue(
        threshold.metric,
        [
          "p50LatencyMs",
          "p95LatencyMs",
          "errorRatePct",
          "requestsPerSecond",
          "saturationPct",
        ],
        `${path}.metric`,
      );
      enumValue(threshold.operator, ["lte", "gte"], `${path}.operator`);
      finiteNumber(threshold.threshold, `${path}.threshold`);
    },
  );

  list(pack.timeline, "pack.timeline", 1, 30).forEach((eventValue, index) => {
    const path = `pack.timeline[${index}]`;
    const event = record(eventValue, path);
    text(event.id, `${path}.id`, 80);
    timestamp(event.timestamp, `${path}.timestamp`);
    enumValue(event.actor, ["system", "human", "agent"], `${path}.actor`);
    enumValue(
      event.type,
      [
        "incident",
        "inspection",
        "hypothesis",
        "simulation",
        "stage",
        "approval",
        "apply",
        "recovery",
        "note",
      ],
      `${path}.type`,
    );
    text(event.title, `${path}.title`, 200);
    text(event.detail, `${path}.detail`, 700);
  });

  return structuredClone(pack) as unknown as IncidentPack;
};

export const parseIncidentPackJson = (json: string): IncidentPack => {
  if (new TextEncoder().encode(json).length > MAX_JSON_BYTES) {
    fail("pack", "JSON file must be 1 MB or smaller");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    fail("pack", "must contain valid JSON");
  }
  return validateIncidentPack(parsed);
};

export const isTelemetryRecord = (
  value: unknown,
): value is Record<string, ServiceTelemetry> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
