export type ServiceId =
  | "edge"
  | "gateway"
  | "auth"
  | "catalog"
  | "pricing"
  | "checkout"
  | "payments"
  | "inventory"
  | "redis-cache"
  | "inventory-db"
  | "event-queue";

export type ServiceHealth = "healthy" | "degraded" | "critical";

export interface ServiceTelemetry {
  serviceId: ServiceId;
  health: ServiceHealth;
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorRatePct: number;
  requestsPerSecond: number;
  saturationPct: number;
  timestamp: string;
}

export interface ChangeRecord {
  id: string;
  timestamp: string;
  serviceId: ServiceId;
  category: "deploy" | "config" | "feature-flag";
  summary: string;
  version?: string;
  author: string;
  risk: "low" | "medium" | "high";
  diff: Record<string, unknown>;
}

export interface Incident {
  id: string;
  title: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  status:
    | "open"
    | "investigating"
    | "mitigation-staged"
    | "awaiting-human-approval"
    | "mitigating"
    | "resolved";
  startedAt: string;
  affectedServices: ServiceId[];
  customerImpact: string;
  workingHypothesis?: string;
  hypothesisConfidence?: "low" | "medium" | "high";
  hypothesisEvidenceIds?: string[];
  stagedMitigationId?: string;
}

export type MitigationKind =
  "rollback" | "config-restore" | "cache-degrade-mode" | "traffic-shift";

export type MitigationId =
  "M-ROLLBACK-27" | "M-POOL-RESTORE" | "M-CACHE-DEGRADE";

export interface MitigationOption {
  id: MitigationId;
  kind: MitigationKind;
  title: string;
  targetService: ServiceId;
  description: string;
  predictedP95Ms: number;
  predictedErrorRatePct: number;
  estimatedRecoverySeconds: number;
  risk: "low" | "medium" | "high";
  reversible: boolean;
  assumptions: string[];
}

export interface MitigationEffect {
  inventoryRelease: string;
  inventoryDbPoolSize: number;
  staleInventoryCacheSeconds: number;
}

export interface StagedMitigation {
  id: MitigationId;
  option: MitigationOption;
  status: "staged" | "approved" | "applied" | "discarded";
  incidentId: string;
  scenarioSeed: number;
  stagedAt: string;
  approvedAt?: string;
  appliedAt?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: "system" | "human" | "agent";
  type:
    | "incident"
    | "inspection"
    | "hypothesis"
    | "simulation"
    | "stage"
    | "approval"
    | "apply"
    | "recovery"
    | "note";
  title: string;
  detail: string;
}

export type ApplicationPhase =
  | "BOOT"
  | "HEALTHY"
  | "INCIDENT_OPEN"
  | "INVESTIGATING"
  | "MITIGATION_CANDIDATES"
  | "MITIGATION_STAGED"
  | "AWAITING_HUMAN_APPROVAL"
  | "APPROVED"
  | "MITIGATING"
  | "RESOLVED"
  | "POSTMORTEM_READY";

export type UserFlow = "checkout" | "catalog-browse" | "login";

export interface SystemConfig {
  inventoryRelease: string;
  inventoryDbPoolSize: number;
  staleInventoryCacheSeconds: number;
}

export interface MitigationComparison {
  revision: number;
  excludeKinds: MitigationKind[];
  optimizeFor: "lowest-risk" | "fastest-recovery" | "lowest-latency";
  candidateIds: MitigationId[];
}

export interface RecoveryState {
  mitigationId: MitigationId;
  step: number;
  totalSteps: 5;
}

export interface ScenarioState {
  id: "INC-042";
  seed: 42;
  phase: ApplicationPhase;
  phaseHistory: ApplicationPhase[];
  incident: Incident;
  services: Record<ServiceId, ServiceTelemetry>;
  baselineServices: Record<ServiceId, ServiceTelemetry>;
  topology: Record<ServiceId, ServiceId[]>;
  changes: ChangeRecord[];
  mitigationOptions: Record<MitigationId, MitigationOption>;
  mitigationEffects: Record<MitigationId, MitigationEffect>;
  mitigationComparison: MitigationComparison | null;
  stagedMitigation: StagedMitigation | null;
  systemConfig: SystemConfig;
  baselineConfig: SystemConfig;
  timeline: TimelineEvent[];
  recovery: RecoveryState | null;
}

export interface SystemSnapshot {
  incident: {
    id: string;
    status: Incident["status"];
    severity: Incident["severity"];
    customerImpact: string;
  };
  unhealthyServices: Array<{
    serviceId: ServiceId;
    health: Exclude<ServiceHealth, "healthy">;
    p95LatencyMs: number;
    errorRatePct: number;
  }>;
}

export interface RequestTrace {
  flow: UserFlow;
  primaryPath: ServiceId[];
  branches: ServiceId[][];
  unhealthyServices: ServiceId[];
}

export interface RecoveryCheck {
  metric: string;
  value: number;
  threshold: number;
  pass: boolean;
}

export interface RecoveryVerification {
  recovered: boolean;
  checks: RecoveryCheck[];
}
