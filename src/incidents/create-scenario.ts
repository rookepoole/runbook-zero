import type { IncidentPack, ScenarioState } from "../domain/types";

export const cloneIncidentPack = (pack: IncidentPack): IncidentPack =>
  structuredClone(pack);

export const createScenarioFromPack = (
  sourcePack: IncidentPack,
): ScenarioState => {
  const pack = cloneIncidentPack(sourcePack);
  const source = pack.source ?? {
    kind: pack.canonical
      ? ("bundled-simulation" as const)
      : ("imported-simulation" as const),
    label: pack.canonical ? "Canonical deterministic demo" : "Incident Pack",
  };
  return {
    id: pack.incident.id,
    seed: pack.seed,
    pack: {
      packId: pack.packId,
      name: pack.name,
      summary: pack.summary,
      canonical: pack.canonical,
      agentPrompt: pack.agentPrompt,
      impactPath: pack.impactPath,
      topologyTitle: pack.topologyTitle,
      source,
    },
    phase: "INCIDENT_OPEN",
    phaseHistory: ["BOOT", "HEALTHY", "INCIDENT_OPEN"],
    incident: { ...pack.incident, status: "open" },
    services: pack.services,
    baselineServices: pack.baselineServices,
    topology: pack.topology,
    topologyLayout: pack.topologyLayout,
    flows: pack.flows,
    defaultServiceId: pack.defaultServiceId,
    defaultFlow: pack.defaultFlow,
    changes: pack.changes,
    evidence: pack.evidence,
    mitigationOptions: pack.mitigationCandidates,
    mitigationEffects: pack.mitigationEffects,
    mitigationComparison: null,
    stagedMitigation: null,
    externalExecution: null,
    configTargetServiceId: pack.configTargetServiceId,
    systemConfig: pack.systemConfig,
    baselineConfig: pack.baselineConfig,
    recoveryThresholds: pack.recoveryThresholds,
    eventBaseTimestamp: pack.eventBaseTimestamp,
    recoveryTimestamp: pack.recoveryTimestamp,
    timeline: pack.timeline,
    recovery: null,
  };
};
