import { traceRequestPath } from "../../domain/queries";
import type { ServiceId } from "../../domain/types";
import { useRunbookStore } from "../../state/store";

const SERVICE_ORDER: ServiceId[] = [
  "edge",
  "gateway",
  "auth",
  "catalog",
  "pricing",
  "checkout",
  "payments",
  "inventory",
  "redis-cache",
  "inventory-db",
  "event-queue",
];

const healthIcon = { healthy: "✓", degraded: "△", critical: "!" } as const;

export const TopologyPanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const selectedServiceId = useRunbookStore((state) => state.selectedServiceId);
  const tracedFlow = useRunbookStore((state) => state.tracedFlow);
  const selectService = useRunbookStore((state) => state.selectService);
  const tracedServices = new Set(
    tracedFlow
      ? traceRequestPath(scenario, tracedFlow).primaryPath
      : ([] as ServiceId[]),
  );

  return (
    <section
      aria-labelledby="topology-heading"
      className={`workspace-panel topology-panel${focusedSurface === "topology" ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Service topology</p>
          <h2 id="topology-heading">Checkout dependency path</h2>
        </div>
        {tracedFlow && (
          <span className="agent-chip">AGENT TRACE · {tracedFlow}</span>
        )}
      </div>
      <div className="topology-flow" aria-label="Service dependency topology">
        {SERVICE_ORDER.map((serviceId) => {
          const service = scenario.services[serviceId];
          const traced = tracedServices.has(serviceId);
          return (
            <button
              type="button"
              key={serviceId}
              className={`topology-node topology-node--${service.health}${traced ? " topology-node--traced" : ""}${selectedServiceId === serviceId ? " topology-node--selected" : ""}`}
              onClick={() => selectService(serviceId)}
            >
              <span aria-hidden="true" className="topology-node__icon">
                {healthIcon[service.health]}
              </span>
              <span>
                <strong>{serviceId}</strong>
                <small>{service.health.toUpperCase()}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="topology-legend">
        <span>edge → gateway → checkout → inventory → inventory-db</span>
        <span>Solid outline = selected · blue bracket = agent trace</span>
      </div>
    </section>
  );
};
