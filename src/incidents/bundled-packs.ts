import type {
  IncidentPack,
  MitigationEffect,
  RecoveryFrame,
  ServiceHealth,
  ServiceId,
  ServiceTelemetry,
} from "../domain/types";

const telemetry = (
  timestamp: string,
  serviceId: ServiceId,
  p50LatencyMs: number,
  p95LatencyMs: number,
  errorRatePct: number,
  requestsPerSecond: number,
  saturationPct: number,
  health: ServiceHealth = "healthy",
): ServiceTelemetry => ({
  serviceId,
  health,
  p50LatencyMs,
  p95LatencyMs,
  errorRatePct,
  requestsPerSecond,
  saturationPct,
  timestamp,
});

const effect = (
  resultingConfig: MitigationEffect["resultingConfig"],
  recoveryFrames: RecoveryFrame[],
): MitigationEffect => ({ resultingConfig, recoveryFrames });

const canonicalRecovery = (
  predictedP95Ms: number,
  predictedErrorRatePct: number,
): RecoveryFrame[] => [
  {
    serviceUpdates: {
      "inventory-db": {
        saturationPct: 68,
        p50LatencyMs: 70,
        p95LatencyMs: 260,
        errorRatePct: 2.4,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      "inventory-db": { health: "degraded" },
      inventory: {
        p50LatencyMs: 180,
        p95LatencyMs: 760,
        errorRatePct: 2.1,
        saturationPct: 63,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      checkout: {
        errorRatePct: predictedErrorRatePct,
        saturationPct: 61,
        health: "degraded",
      },
      gateway: {
        errorRatePct: 0.5,
        saturationPct: 49,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      checkout: {
        p50LatencyMs: 145,
        p95LatencyMs: predictedP95Ms,
        health: "degraded",
      },
      inventory: {
        p50LatencyMs: 120,
        p95LatencyMs: Math.max(340, predictedP95Ms - 30),
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      gateway: {
        p50LatencyMs: 34,
        p95LatencyMs: 95,
        errorRatePct: 0.3,
        saturationPct: 45,
        health: "healthy",
      },
      checkout: {
        p50LatencyMs: 145,
        p95LatencyMs: predictedP95Ms,
        errorRatePct: predictedErrorRatePct,
        saturationPct: 55,
        health: "healthy",
      },
      inventory: {
        p50LatencyMs: 82,
        p95LatencyMs: Math.max(280, predictedP95Ms - 140),
        errorRatePct: 0.5,
        saturationPct: 54,
        health: "healthy",
      },
      "inventory-db": {
        p50LatencyMs: 18,
        p95LatencyMs: 38,
        errorRatePct: 0.2,
        saturationPct: 55,
        health: "healthy",
      },
    },
  },
];

const canonicalTimestamp = "2026-08-25T14:05:00.000Z";
const canonicalBaseline = {
  edge: telemetry(canonicalTimestamp, "edge", 18, 42, 0.1, 1520, 41),
  gateway: telemetry(canonicalTimestamp, "gateway", 24, 67, 0.2, 1490, 44),
  auth: telemetry(canonicalTimestamp, "auth", 32, 81, 0.1, 340, 37),
  catalog: telemetry(canonicalTimestamp, "catalog", 45, 120, 0.2, 720, 51),
  pricing: telemetry(canonicalTimestamp, "pricing", 39, 102, 0.1, 680, 46),
  checkout: telemetry(canonicalTimestamp, "checkout", 105, 310, 0.4, 260, 48),
  payments: telemetry(canonicalTimestamp, "payments", 80, 205, 0.2, 245, 43),
  inventory: telemetry(canonicalTimestamp, "inventory", 74, 190, 0.3, 410, 49),
  "redis-cache": telemetry(canonicalTimestamp, "redis-cache", 3, 9, 0, 900, 32),
  "inventory-db": telemetry(
    canonicalTimestamp,
    "inventory-db",
    12,
    35,
    0.1,
    520,
    45,
  ),
  "event-queue": telemetry(
    canonicalTimestamp,
    "event-queue",
    5,
    14,
    0,
    190,
    29,
  ),
};

export const canonicalIncidentPack: IncidentPack = {
  schemaVersion: 1,
  packId: "checkout-pool-regression",
  name: "Checkout pool regression",
  summary: "Canonical INC-042 database-pool regression and recovery.",
  canonical: true,
  seed: 42,
  agentPrompt:
    "Checkout latency spiked after this morning's deployment. Find the likely cause. Don't change production yet.",
  impactPath: "Checkout → inventory reservation",
  topologyTitle: "Checkout dependency graph",
  defaultServiceId: "checkout",
  defaultFlow: "checkout",
  eventBaseTimestamp: canonicalTimestamp,
  recoveryTimestamp: "2026-08-25T14:06:00.000Z",
  incident: {
    id: "INC-042",
    title: "Checkout latency and inventory reservation failures",
    severity: "SEV-2",
    startedAt: "2026-08-25T14:02:00.000Z",
    affectedServices: ["checkout", "inventory", "inventory-db", "gateway"],
    customerImpact:
      "Checkout requests are slow and intermittently fail during inventory reservation.",
  },
  baselineServices: canonicalBaseline,
  services: {
    ...canonicalBaseline,
    gateway: telemetry(
      canonicalTimestamp,
      "gateway",
      420,
      4200,
      13.8,
      1490,
      72,
      "degraded",
    ),
    checkout: telemetry(
      canonicalTimestamp,
      "checkout",
      980,
      4700,
      17,
      260,
      88,
      "critical",
    ),
    inventory: telemetry(
      canonicalTimestamp,
      "inventory",
      870,
      4380,
      16.4,
      410,
      91,
      "critical",
    ),
    "inventory-db": telemetry(
      canonicalTimestamp,
      "inventory-db",
      610,
      3910,
      15.9,
      520,
      97,
      "critical",
    ),
  },
  topology: {
    edge: ["gateway"],
    gateway: ["auth", "catalog", "checkout"],
    auth: [],
    catalog: ["pricing", "inventory"],
    pricing: [],
    checkout: ["payments", "inventory"],
    payments: [],
    inventory: ["redis-cache", "inventory-db", "event-queue"],
    "redis-cache": [],
    "inventory-db": [],
    "event-queue": [],
  },
  topologyLayout: {
    edge: { x: 3, y: 42 },
    gateway: { x: 21, y: 42 },
    auth: { x: 40, y: 4 },
    catalog: { x: 40, y: 28 },
    checkout: { x: 40, y: 55 },
    pricing: { x: 59, y: 12 },
    payments: { x: 59, y: 37 },
    inventory: { x: 59, y: 64 },
    "redis-cache": { x: 79, y: 35 },
    "inventory-db": { x: 79, y: 61 },
    "event-queue": { x: 79, y: 84 },
  },
  flows: {
    checkout: {
      id: "checkout",
      label: "Checkout",
      primaryPath: ["edge", "gateway", "checkout", "inventory", "inventory-db"],
      branches: [
        ["checkout", "payments"],
        ["inventory", "redis-cache"],
        ["inventory", "event-queue"],
      ],
    },
    "catalog-browse": {
      id: "catalog-browse",
      label: "Catalog browse",
      primaryPath: ["edge", "gateway", "catalog", "inventory", "inventory-db"],
      branches: [
        ["catalog", "pricing"],
        ["inventory", "redis-cache"],
      ],
    },
    login: {
      id: "login",
      label: "Login",
      primaryPath: ["edge", "gateway", "auth"],
      branches: [],
    },
  },
  changes: [
    {
      id: "CHG-271",
      timestamp: "2026-08-25T13:51:00.000Z",
      serviceId: "inventory",
      category: "deploy",
      summary: "Deployed inventory-v2.7.0 with reduced database pool",
      version: "inventory-v2.7.0",
      author: "release-bot",
      risk: "high",
      diff: { dbPoolSize: { from: 80, to: 12 } },
    },
  ],
  evidence: [
    {
      id: "CHG-271",
      kind: "change",
      summary: "Inventory deploy reduced the database pool.",
      serviceIds: ["checkout", "inventory", "inventory-db"],
    },
    {
      id: "inventory-db.saturationPct",
      kind: "telemetry",
      summary: "Inventory database saturation reached 97%.",
      serviceIds: ["inventory-db", "inventory"],
    },
    {
      id: "TRACE-checkout",
      kind: "trace",
      summary: "Checkout depends on inventory and inventory-db.",
      serviceIds: ["checkout", "inventory", "inventory-db"],
    },
  ],
  mitigationCandidates: {
    "M-ROLLBACK-27": {
      id: "M-ROLLBACK-27",
      kind: "rollback",
      title: "Rollback inventory-v2.7.0",
      targetService: "inventory",
      description: "Return inventory to the last known-good release.",
      exactActions: [
        {
          targetService: "inventory",
          field: "inventoryRelease",
          from: "inventory-v2.7.0",
          to: "inventory-v2.6.4",
        },
      ],
      predictedP95Ms: 390,
      predictedErrorRatePct: 0.7,
      estimatedRecoverySeconds: 75,
      risk: "medium",
      reversible: true,
      assumptions: ["The prior image remains available."],
    },
    "M-POOL-RESTORE": {
      id: "M-POOL-RESTORE",
      kind: "config-restore",
      title: "Restore inventory database pool",
      targetService: "inventory",
      description: "Restore dbPoolSize from 12 to its known-good value of 80.",
      exactActions: [
        {
          targetService: "inventory",
          field: "dbPoolSize",
          from: 12,
          to: 80,
        },
      ],
      predictedP95Ms: 420,
      predictedErrorRatePct: 0.8,
      estimatedRecoverySeconds: 45,
      risk: "low",
      reversible: true,
      assumptions: ["Database capacity supports the known-good pool size."],
    },
    "M-CACHE-DEGRADE": {
      id: "M-CACHE-DEGRADE",
      kind: "cache-degrade-mode",
      title: "Enable stale inventory cache",
      targetService: "inventory",
      description:
        "Serve inventory reads from a bounded stale cache for 30 seconds.",
      exactActions: [
        {
          targetService: "inventory",
          field: "staleInventoryCacheSeconds",
          from: 0,
          to: 30,
        },
      ],
      predictedP95Ms: 650,
      predictedErrorRatePct: 1.5,
      estimatedRecoverySeconds: 25,
      risk: "low",
      reversible: true,
      assumptions: ["Thirty seconds of inventory staleness is acceptable."],
    },
  },
  mitigationEffects: {
    "M-ROLLBACK-27": effect(
      {
        inventoryRelease: "inventory-v2.6.4",
        inventoryDbPoolSize: 80,
        staleInventoryCacheSeconds: 0,
      },
      canonicalRecovery(390, 0.7),
    ),
    "M-POOL-RESTORE": effect(
      {
        inventoryRelease: "inventory-v2.7.0",
        inventoryDbPoolSize: 80,
        staleInventoryCacheSeconds: 0,
      },
      canonicalRecovery(420, 0.8),
    ),
    "M-CACHE-DEGRADE": effect(
      {
        inventoryRelease: "inventory-v2.7.0",
        inventoryDbPoolSize: 12,
        staleInventoryCacheSeconds: 30,
      },
      canonicalRecovery(650, 1.5),
    ),
  },
  configTargetServiceId: "inventory",
  systemConfig: {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 12,
    staleInventoryCacheSeconds: 0,
  },
  baselineConfig: {
    inventoryRelease: "inventory-v2.7.0",
    inventoryDbPoolSize: 80,
    staleInventoryCacheSeconds: 0,
  },
  recoveryThresholds: [
    {
      serviceId: "checkout",
      metric: "p95LatencyMs",
      operator: "lte",
      threshold: 500,
    },
    {
      serviceId: "checkout",
      metric: "errorRatePct",
      operator: "lte",
      threshold: 1,
    },
    {
      serviceId: "inventory-db",
      metric: "saturationPct",
      operator: "lte",
      threshold: 70,
    },
  ],
  timeline: [
    {
      id: "EVT-001",
      timestamp: "2026-08-25T14:02:00.000Z",
      actor: "system",
      type: "incident",
      title: "INC-042 opened",
      detail: "Checkout SLO breached after inventory-v2.7.0 deployment.",
    },
  ],
};

const paymentTimestamp = "2026-08-25T16:20:00.000Z";
const paymentBaseline = {
  edge: telemetry(paymentTimestamp, "edge", 18, 45, 0.1, 1700, 40),
  gateway: telemetry(paymentTimestamp, "gateway", 27, 75, 0.2, 1660, 45),
  checkout: telemetry(paymentTimestamp, "checkout", 110, 290, 0.3, 310, 48),
  payments: telemetry(paymentTimestamp, "payments", 85, 220, 0.2, 300, 46),
  "payment-events": telemetry(
    paymentTimestamp,
    "payment-events",
    8,
    20,
    0,
    290,
    31,
  ),
  "payment-consumer": telemetry(
    paymentTimestamp,
    "payment-consumer",
    42,
    130,
    0.2,
    285,
    44,
  ),
  ledger: telemetry(paymentTimestamp, "ledger", 38, 105, 0.1, 280, 42),
  notifications: telemetry(
    paymentTimestamp,
    "notifications",
    34,
    98,
    0.1,
    260,
    39,
  ),
};

const paymentRecovery = (
  predictedP95Ms: number,
  predictedErrorRatePct: number,
): RecoveryFrame[] => [
  {
    serviceUpdates: {
      "payment-events": { saturationPct: 82, health: "degraded" },
    },
  },
  {
    serviceUpdates: {
      "payment-consumer": {
        p95LatencyMs: 780,
        errorRatePct: 2.4,
        saturationPct: 68,
        health: "degraded",
      },
      "payment-events": {
        p95LatencyMs: 120,
        saturationPct: 72,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      payments: {
        errorRatePct: predictedErrorRatePct,
        saturationPct: 58,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      payments: { p95LatencyMs: predictedP95Ms, health: "degraded" },
      checkout: {
        p95LatencyMs: predictedP95Ms + 90,
        errorRatePct: 0.7,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      gateway: {
        p50LatencyMs: 30,
        p95LatencyMs: 88,
        errorRatePct: 0.2,
        saturationPct: 44,
        health: "healthy",
      },
      checkout: {
        p50LatencyMs: 125,
        p95LatencyMs: predictedP95Ms + 70,
        errorRatePct: 0.6,
        saturationPct: 51,
        health: "healthy",
      },
      payments: {
        p50LatencyMs: 105,
        p95LatencyMs: predictedP95Ms,
        errorRatePct: predictedErrorRatePct,
        saturationPct: 52,
        health: "healthy",
      },
      "payment-events": {
        p50LatencyMs: 12,
        p95LatencyMs: 45,
        errorRatePct: 0,
        saturationPct: 58,
        health: "healthy",
      },
      "payment-consumer": {
        p50LatencyMs: 58,
        p95LatencyMs: 160,
        errorRatePct: 0.3,
        saturationPct: 55,
        health: "healthy",
      },
    },
  },
];

export const paymentQueueIncidentPack: IncidentPack = {
  schemaVersion: 1,
  packId: "payment-queue-backlog",
  name: "Payment event queue backlog",
  summary:
    "Consumer concurrency regression delaying payment confirmation events.",
  canonical: false,
  seed: 117,
  agentPrompt:
    "Payment confirmations are delayed and the event backlog is climbing. Find the regression and stage the lowest-risk recovery without applying it.",
  impactPath: "Checkout → payments → confirmation events",
  topologyTitle: "Payment confirmation dependency graph",
  defaultServiceId: "payments",
  defaultFlow: "payment-confirmation",
  eventBaseTimestamp: paymentTimestamp,
  recoveryTimestamp: "2026-08-25T16:21:00.000Z",
  incident: {
    id: "INC-117",
    title: "Payment confirmation event backlog",
    severity: "SEV-1",
    startedAt: "2026-08-25T16:17:00.000Z",
    affectedServices: [
      "checkout",
      "payments",
      "payment-events",
      "payment-consumer",
      "gateway",
    ],
    customerImpact:
      "Customers complete checkout but wait minutes for payment confirmation and receipts.",
  },
  baselineServices: paymentBaseline,
  services: {
    ...paymentBaseline,
    gateway: telemetry(
      paymentTimestamp,
      "gateway",
      210,
      1800,
      6,
      1660,
      69,
      "degraded",
    ),
    checkout: telemetry(
      paymentTimestamp,
      "checkout",
      360,
      2100,
      6.8,
      310,
      74,
      "degraded",
    ),
    payments: telemetry(
      paymentTimestamp,
      "payments",
      720,
      3200,
      9.5,
      300,
      89,
      "critical",
    ),
    "payment-events": telemetry(
      paymentTimestamp,
      "payment-events",
      410,
      2800,
      8.9,
      290,
      98,
      "critical",
    ),
    "payment-consumer": telemetry(
      paymentTimestamp,
      "payment-consumer",
      530,
      2400,
      8.8,
      42,
      96,
      "critical",
    ),
  },
  topology: {
    edge: ["gateway"],
    gateway: ["checkout"],
    checkout: ["payments"],
    payments: ["payment-events", "ledger"],
    "payment-events": ["payment-consumer"],
    "payment-consumer": ["ledger", "notifications"],
    ledger: [],
    notifications: [],
  },
  topologyLayout: {
    edge: { x: 3, y: 44 },
    gateway: { x: 20, y: 44 },
    checkout: { x: 37, y: 44 },
    payments: { x: 54, y: 44 },
    "payment-events": { x: 70, y: 24 },
    "payment-consumer": { x: 70, y: 62 },
    ledger: { x: 86, y: 34 },
    notifications: { x: 86, y: 72 },
  },
  flows: {
    "payment-confirmation": {
      id: "payment-confirmation",
      label: "Payment confirmation",
      primaryPath: [
        "edge",
        "gateway",
        "checkout",
        "payments",
        "payment-events",
        "payment-consumer",
        "notifications",
      ],
      branches: [
        ["payments", "ledger"],
        ["payment-consumer", "ledger"],
      ],
    },
    "checkout-payment": {
      id: "checkout-payment",
      label: "Checkout payment",
      primaryPath: ["edge", "gateway", "checkout", "payments", "ledger"],
      branches: [["payments", "payment-events"]],
    },
  },
  changes: [
    {
      id: "CHG-884",
      timestamp: "2026-08-25T16:08:00.000Z",
      serviceId: "payment-consumer",
      category: "config",
      summary: "Reduced payment event consumer concurrency",
      version: "payment-consumer-v5.4.1",
      author: "config-bot",
      risk: "high",
      diff: { consumerConcurrency: { from: 24, to: 4 } },
    },
  ],
  evidence: [
    {
      id: "CHG-884",
      kind: "change",
      summary: "Consumer concurrency dropped from 24 to 4.",
      serviceIds: ["payment-consumer", "payment-events"],
    },
    {
      id: "payment-events.saturationPct",
      kind: "telemetry",
      summary: "The payment event queue is 98% saturated.",
      serviceIds: ["payment-events", "payments"],
    },
    {
      id: "TRACE-payment-confirmation",
      kind: "trace",
      summary: "Confirmation delivery crosses the constrained consumer.",
      serviceIds: ["payments", "payment-events", "payment-consumer"],
    },
  ],
  mitigationCandidates: {
    "M-PAY-ROLLBACK": {
      id: "M-PAY-ROLLBACK",
      kind: "rollback",
      title: "Rollback payment-consumer-v5.4.1",
      targetService: "payment-consumer",
      description:
        "Return the payment consumer to the prior release and concurrency profile.",
      exactActions: [
        {
          targetService: "payment-consumer",
          field: "consumerRelease",
          from: "payment-consumer-v5.4.1",
          to: "payment-consumer-v5.4.0",
        },
      ],
      predictedP95Ms: 330,
      predictedErrorRatePct: 0.5,
      estimatedRecoverySeconds: 70,
      risk: "medium",
      reversible: true,
      assumptions: ["The prior consumer image is available."],
    },
    "M-PAY-CONCURRENCY-RESTORE": {
      id: "M-PAY-CONCURRENCY-RESTORE",
      kind: "capacity-adjustment",
      title: "Restore payment consumer concurrency",
      targetService: "payment-consumer",
      description:
        "Restore consumerConcurrency from 4 to the known-good value of 24.",
      exactActions: [
        {
          targetService: "payment-consumer",
          field: "consumerConcurrency",
          from: 4,
          to: 24,
        },
      ],
      predictedP95Ms: 360,
      predictedErrorRatePct: 0.6,
      estimatedRecoverySeconds: 40,
      risk: "low",
      reversible: true,
      assumptions: ["Broker partitions can sustain 24 concurrent consumers."],
    },
    "M-PAY-TRAFFIC-SHIFT": {
      id: "M-PAY-TRAFFIC-SHIFT",
      kind: "traffic-shift",
      title: "Shift confirmation traffic to the secondary consumer pool",
      targetService: "payment-consumer",
      description:
        "Move 40% of confirmation events to the warm secondary pool.",
      exactActions: [
        {
          targetService: "payment-consumer",
          field: "primaryTrafficPct",
          from: 100,
          to: 60,
        },
      ],
      predictedP95Ms: 520,
      predictedErrorRatePct: 0.9,
      estimatedRecoverySeconds: 30,
      risk: "medium",
      reversible: true,
      assumptions: [
        "The secondary pool is warm and within replication lag policy.",
      ],
    },
  },
  mitigationEffects: {
    "M-PAY-ROLLBACK": effect(
      {
        consumerRelease: "payment-consumer-v5.4.0",
        consumerConcurrency: 24,
        primaryTrafficPct: 100,
      },
      paymentRecovery(330, 0.5),
    ),
    "M-PAY-CONCURRENCY-RESTORE": effect(
      {
        consumerRelease: "payment-consumer-v5.4.1",
        consumerConcurrency: 24,
        primaryTrafficPct: 100,
      },
      paymentRecovery(360, 0.6),
    ),
    "M-PAY-TRAFFIC-SHIFT": effect(
      {
        consumerRelease: "payment-consumer-v5.4.1",
        consumerConcurrency: 4,
        primaryTrafficPct: 60,
      },
      paymentRecovery(520, 0.9),
    ),
  },
  configTargetServiceId: "payment-consumer",
  systemConfig: {
    consumerRelease: "payment-consumer-v5.4.1",
    consumerConcurrency: 4,
    primaryTrafficPct: 100,
  },
  baselineConfig: {
    consumerRelease: "payment-consumer-v5.4.1",
    consumerConcurrency: 24,
    primaryTrafficPct: 100,
  },
  recoveryThresholds: [
    {
      serviceId: "payments",
      metric: "p95LatencyMs",
      operator: "lte",
      threshold: 500,
    },
    {
      serviceId: "payments",
      metric: "errorRatePct",
      operator: "lte",
      threshold: 1,
    },
    {
      serviceId: "payment-events",
      metric: "saturationPct",
      operator: "lte",
      threshold: 70,
    },
  ],
  timeline: [
    {
      id: "EVT-001",
      timestamp: "2026-08-25T16:17:00.000Z",
      actor: "system",
      type: "incident",
      title: "INC-117 opened",
      detail: "Payment confirmation lag breached the two-minute SLO.",
    },
  ],
};

const catalogTimestamp = "2026-08-25T18:40:00.000Z";
const catalogBaseline = {
  edge: telemetry(catalogTimestamp, "edge", 17, 44, 0.1, 2400, 42),
  gateway: telemetry(catalogTimestamp, "gateway", 25, 72, 0.2, 2350, 46),
  catalog: telemetry(catalogTimestamp, "catalog", 48, 145, 0.2, 1200, 49),
  "redis-cache": telemetry(catalogTimestamp, "redis-cache", 3, 10, 0, 2100, 34),
  "catalog-db": telemetry(catalogTimestamp, "catalog-db", 18, 55, 0.1, 610, 47),
  pricing: telemetry(catalogTimestamp, "pricing", 35, 96, 0.1, 980, 43),
  search: telemetry(catalogTimestamp, "search", 52, 170, 0.2, 760, 50),
  recommendations: telemetry(
    catalogTimestamp,
    "recommendations",
    62,
    190,
    0.3,
    540,
    51,
  ),
};

const catalogRecovery = (
  predictedP95Ms: number,
  predictedErrorRatePct: number,
): RecoveryFrame[] => [
  {
    serviceUpdates: {
      "redis-cache": { saturationPct: 82, health: "degraded" },
    },
  },
  {
    serviceUpdates: {
      "catalog-db": {
        p95LatencyMs: 460,
        errorRatePct: 1.8,
        saturationPct: 71,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      catalog: {
        errorRatePct: predictedErrorRatePct,
        saturationPct: 61,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      catalog: { p95LatencyMs: predictedP95Ms, health: "degraded" },
      gateway: {
        p95LatencyMs: predictedP95Ms + 80,
        errorRatePct: 0.5,
        health: "degraded",
      },
    },
  },
  {
    serviceUpdates: {
      gateway: {
        p50LatencyMs: 29,
        p95LatencyMs: 86,
        errorRatePct: 0.2,
        saturationPct: 45,
        health: "healthy",
      },
      catalog: {
        p50LatencyMs: 60,
        p95LatencyMs: predictedP95Ms,
        errorRatePct: predictedErrorRatePct,
        saturationPct: 54,
        health: "healthy",
      },
      "redis-cache": {
        p50LatencyMs: 4,
        p95LatencyMs: 14,
        errorRatePct: 0,
        saturationPct: 58,
        health: "healthy",
      },
      "catalog-db": {
        p50LatencyMs: 23,
        p95LatencyMs: 70,
        errorRatePct: 0.2,
        saturationPct: 55,
        health: "healthy",
      },
    },
  },
];

export const catalogCacheIncidentPack: IncidentPack = {
  schemaVersion: 1,
  packId: "catalog-cache-stampede",
  name: "Catalog cache stampede",
  summary:
    "TTL regression amplifying catalog database load and browse latency.",
  canonical: false,
  seed: 203,
  agentPrompt:
    "Catalog browsing is timing out while database load surges. Trace the stampede, identify the configuration regression, and stage a reversible fix for review.",
  impactPath: "Browse → catalog cache → catalog database",
  topologyTitle: "Catalog browse dependency graph",
  defaultServiceId: "catalog",
  defaultFlow: "catalog-browse",
  eventBaseTimestamp: catalogTimestamp,
  recoveryTimestamp: "2026-08-25T18:41:00.000Z",
  incident: {
    id: "INC-203",
    title: "Catalog cache stampede",
    severity: "SEV-2",
    startedAt: "2026-08-25T18:36:00.000Z",
    affectedServices: ["gateway", "catalog", "redis-cache", "catalog-db"],
    customerImpact:
      "Product pages intermittently time out and search traffic is falling back to stale results.",
  },
  baselineServices: catalogBaseline,
  services: {
    ...catalogBaseline,
    gateway: telemetry(
      catalogTimestamp,
      "gateway",
      290,
      2500,
      7.4,
      2350,
      76,
      "degraded",
    ),
    catalog: telemetry(
      catalogTimestamp,
      "catalog",
      890,
      4100,
      12.8,
      1200,
      93,
      "critical",
    ),
    "redis-cache": telemetry(
      catalogTimestamp,
      "redis-cache",
      180,
      1600,
      11.9,
      5200,
      99,
      "critical",
    ),
    "catalog-db": telemetry(
      catalogTimestamp,
      "catalog-db",
      620,
      3300,
      10.6,
      2400,
      96,
      "critical",
    ),
  },
  topology: {
    edge: ["gateway"],
    gateway: ["catalog", "search"],
    catalog: ["redis-cache", "catalog-db", "pricing", "recommendations"],
    "redis-cache": ["catalog-db"],
    "catalog-db": [],
    pricing: [],
    search: ["catalog"],
    recommendations: ["catalog"],
  },
  topologyLayout: {
    edge: { x: 3, y: 44 },
    gateway: { x: 20, y: 44 },
    search: { x: 38, y: 18 },
    catalog: { x: 38, y: 52 },
    pricing: { x: 58, y: 12 },
    recommendations: { x: 58, y: 76 },
    "redis-cache": { x: 58, y: 42 },
    "catalog-db": { x: 80, y: 42 },
  },
  flows: {
    "catalog-browse": {
      id: "catalog-browse",
      label: "Catalog browse",
      primaryPath: ["edge", "gateway", "catalog", "redis-cache", "catalog-db"],
      branches: [
        ["catalog", "pricing"],
        ["catalog", "recommendations"],
      ],
    },
    "catalog-search": {
      id: "catalog-search",
      label: "Catalog search",
      primaryPath: [
        "edge",
        "gateway",
        "search",
        "catalog",
        "redis-cache",
        "catalog-db",
      ],
      branches: [],
    },
  },
  changes: [
    {
      id: "CHG-931",
      timestamp: "2026-08-25T18:27:00.000Z",
      serviceId: "redis-cache",
      category: "config",
      summary: "Reduced catalog cache TTL during a configuration rollout",
      version: "catalog-config-r91",
      author: "config-bot",
      risk: "high",
      diff: { cacheTtlSeconds: { from: 300, to: 5 } },
    },
  ],
  evidence: [
    {
      id: "CHG-931",
      kind: "change",
      summary: "Catalog cache TTL dropped from 300 seconds to 5.",
      serviceIds: ["catalog", "redis-cache", "catalog-db"],
    },
    {
      id: "redis-cache.requestsPerSecond",
      kind: "telemetry",
      summary:
        "Cache request volume more than doubled while hit rate collapsed.",
      serviceIds: ["redis-cache", "catalog"],
    },
    {
      id: "catalog-db.saturationPct",
      kind: "telemetry",
      summary: "Catalog database saturation reached 96%.",
      serviceIds: ["catalog-db", "catalog"],
    },
  ],
  mitigationCandidates: {
    "M-CATALOG-ROLLBACK": {
      id: "M-CATALOG-ROLLBACK",
      kind: "rollback",
      title: "Rollback catalog-config-r91",
      targetService: "redis-cache",
      description: "Restore the prior catalog cache configuration bundle.",
      exactActions: [
        {
          targetService: "redis-cache",
          field: "configRelease",
          from: "catalog-config-r91",
          to: "catalog-config-r90",
        },
      ],
      predictedP95Ms: 220,
      predictedErrorRatePct: 0.5,
      estimatedRecoverySeconds: 65,
      risk: "medium",
      reversible: true,
      assumptions: ["The prior configuration bundle remains deployable."],
    },
    "M-CATALOG-TTL-RESTORE": {
      id: "M-CATALOG-TTL-RESTORE",
      kind: "config-restore",
      title: "Restore catalog cache TTL",
      targetService: "redis-cache",
      description:
        "Restore cacheTtlSeconds from 5 to the known-good value of 300.",
      exactActions: [
        {
          targetService: "redis-cache",
          field: "cacheTtlSeconds",
          from: 5,
          to: 300,
        },
      ],
      predictedP95Ms: 240,
      predictedErrorRatePct: 0.6,
      estimatedRecoverySeconds: 35,
      risk: "low",
      reversible: true,
      assumptions: [
        "Catalog entries remain valid for the 300-second policy window.",
      ],
    },
    "M-CATALOG-TRAFFIC-SHIFT": {
      id: "M-CATALOG-TRAFFIC-SHIFT",
      kind: "traffic-shift",
      title: "Shift browse traffic to the warm cache pool",
      targetService: "redis-cache",
      description:
        "Move 35% of browse reads to a warm secondary cache while the primary recovers.",
      exactActions: [
        {
          targetService: "redis-cache",
          field: "primaryTrafficPct",
          from: 100,
          to: 65,
        },
      ],
      predictedP95Ms: 420,
      predictedErrorRatePct: 0.9,
      estimatedRecoverySeconds: 22,
      risk: "medium",
      reversible: true,
      assumptions: [
        "The secondary cache contains a sufficiently warm catalog set.",
      ],
    },
  },
  mitigationEffects: {
    "M-CATALOG-ROLLBACK": effect(
      {
        configRelease: "catalog-config-r90",
        cacheTtlSeconds: 300,
        primaryTrafficPct: 100,
      },
      catalogRecovery(220, 0.5),
    ),
    "M-CATALOG-TTL-RESTORE": effect(
      {
        configRelease: "catalog-config-r91",
        cacheTtlSeconds: 300,
        primaryTrafficPct: 100,
      },
      catalogRecovery(240, 0.6),
    ),
    "M-CATALOG-TRAFFIC-SHIFT": effect(
      {
        configRelease: "catalog-config-r91",
        cacheTtlSeconds: 5,
        primaryTrafficPct: 65,
      },
      catalogRecovery(420, 0.9),
    ),
  },
  configTargetServiceId: "redis-cache",
  systemConfig: {
    configRelease: "catalog-config-r91",
    cacheTtlSeconds: 5,
    primaryTrafficPct: 100,
  },
  baselineConfig: {
    configRelease: "catalog-config-r91",
    cacheTtlSeconds: 300,
    primaryTrafficPct: 100,
  },
  recoveryThresholds: [
    {
      serviceId: "catalog",
      metric: "p95LatencyMs",
      operator: "lte",
      threshold: 300,
    },
    {
      serviceId: "catalog",
      metric: "errorRatePct",
      operator: "lte",
      threshold: 1,
    },
    {
      serviceId: "redis-cache",
      metric: "saturationPct",
      operator: "lte",
      threshold: 65,
    },
  ],
  timeline: [
    {
      id: "EVT-001",
      timestamp: "2026-08-25T18:36:00.000Z",
      actor: "system",
      type: "incident",
      title: "INC-203 opened",
      detail:
        "Catalog browse latency and database load breached policy thresholds.",
    },
  ],
};

export const BUNDLED_INCIDENT_PACKS: IncidentPack[] = [
  canonicalIncidentPack,
  paymentQueueIncidentPack,
  catalogCacheIncidentPack,
];
