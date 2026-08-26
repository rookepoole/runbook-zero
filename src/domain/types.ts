export type ServiceId = string;

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

export type PrimitiveConfigValue = string | number | boolean | null;
export type ServiceConfig = Record<string, PrimitiveConfigValue>;

export interface ChangeDiffValue {
  from: PrimitiveConfigValue;
  to: PrimitiveConfigValue;
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
  diff: Record<string, ChangeDiffValue>;
}

export interface EvidenceRecord {
  id: string;
  kind: "telemetry" | "change" | "trace" | "configuration";
  summary: string;
  serviceIds: ServiceId[];
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
  | "rollback"
  | "config-restore"
  | "cache-degrade-mode"
  | "traffic-shift"
  | "capacity-adjustment";

export type MitigationId = string;

export interface ExactAction {
  targetService: ServiceId;
  field: string;
  from: PrimitiveConfigValue;
  to: PrimitiveConfigValue;
}

export interface MitigationOption {
  id: MitigationId;
  kind: MitigationKind;
  title: string;
  targetService: ServiceId;
  description: string;
  exactActions: ExactAction[];
  predictedP95Ms: number;
  predictedErrorRatePct: number;
  estimatedRecoverySeconds: number;
  risk: "low" | "medium" | "high";
  reversible: boolean;
  assumptions: string[];
}

export type TelemetryUpdate = Partial<
  Omit<ServiceTelemetry, "serviceId" | "timestamp">
>;

export interface RecoveryFrame {
  serviceUpdates: Record<ServiceId, TelemetryUpdate>;
}

export interface MitigationEffect {
  resultingConfig: ServiceConfig;
  recoveryFrames: RecoveryFrame[];
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

export type UserFlow = string;

export interface FlowDefinition {
  id: UserFlow;
  label: string;
  primaryPath: ServiceId[];
  branches: ServiceId[][];
}

export interface TopologyPosition {
  x: number;
  y: number;
}

export interface RecoveryThreshold {
  serviceId: ServiceId;
  metric:
    | "p50LatencyMs"
    | "p95LatencyMs"
    | "errorRatePct"
    | "requestsPerSecond"
    | "saturationPct";
  operator: "lte" | "gte";
  threshold: number;
}

export interface IncidentPack {
  schemaVersion: 1;
  packId: string;
  name: string;
  summary: string;
  canonical: boolean;
  seed: number;
  agentPrompt: string;
  impactPath: string;
  topologyTitle: string;
  defaultServiceId: ServiceId;
  defaultFlow: UserFlow;
  eventBaseTimestamp: string;
  recoveryTimestamp: string;
  incident: Omit<
    Incident,
    | "status"
    | "workingHypothesis"
    | "hypothesisConfidence"
    | "hypothesisEvidenceIds"
    | "stagedMitigationId"
  >;
  services: Record<ServiceId, ServiceTelemetry>;
  baselineServices: Record<ServiceId, ServiceTelemetry>;
  topology: Record<ServiceId, ServiceId[]>;
  topologyLayout: Record<ServiceId, TopologyPosition>;
  flows: Record<UserFlow, FlowDefinition>;
  changes: ChangeRecord[];
  evidence: EvidenceRecord[];
  mitigationCandidates: Record<MitigationId, MitigationOption>;
  mitigationEffects: Record<MitigationId, MitigationEffect>;
  configTargetServiceId: ServiceId;
  systemConfig: ServiceConfig;
  baselineConfig: ServiceConfig;
  recoveryThresholds: RecoveryThreshold[];
  timeline: TimelineEvent[];
}

export interface IncidentPackMetadata {
  packId: string;
  name: string;
  summary: string;
  canonical: boolean;
  agentPrompt: string;
  impactPath: string;
  topologyTitle: string;
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
  totalSteps: number;
}

export interface ScenarioState {
  id: string;
  seed: number;
  pack: IncidentPackMetadata;
  phase: ApplicationPhase;
  phaseHistory: ApplicationPhase[];
  incident: Incident;
  services: Record<ServiceId, ServiceTelemetry>;
  baselineServices: Record<ServiceId, ServiceTelemetry>;
  topology: Record<ServiceId, ServiceId[]>;
  topologyLayout: Record<ServiceId, TopologyPosition>;
  flows: Record<UserFlow, FlowDefinition>;
  defaultServiceId: ServiceId;
  defaultFlow: UserFlow;
  changes: ChangeRecord[];
  evidence: EvidenceRecord[];
  mitigationOptions: Record<MitigationId, MitigationOption>;
  mitigationEffects: Record<MitigationId, MitigationEffect>;
  mitigationComparison: MitigationComparison | null;
  stagedMitigation: StagedMitigation | null;
  configTargetServiceId: ServiceId;
  systemConfig: ServiceConfig;
  baselineConfig: ServiceConfig;
  recoveryThresholds: RecoveryThreshold[];
  eventBaseTimestamp: string;
  recoveryTimestamp: string;
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
