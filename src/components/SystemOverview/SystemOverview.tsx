import { getSystemSnapshot } from "../../domain/queries";
import { useRunbookStore } from "../../state/store";

export const SystemOverview = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const lastAgentAction = useRunbookStore((state) => state.lastAgentAction);
  const snapshotInvocationCount = useRunbookStore(
    (state) => state.snapshotInvocationCount,
  );
  const snapshot = getSystemSnapshot(scenario);
  const checkout = scenario.services.checkout;
  const isAgentFocused = focusedSurface === "system-overview";

  return (
    <section
      aria-labelledby="system-overview-heading"
      className={`system-overview${isAgentFocused ? " system-overview--agent-focus" : ""}`}
      data-testid="system-overview"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live incident surface</p>
          <h2 id="system-overview-heading">System overview</h2>
        </div>
        {isAgentFocused && <span className="agent-chip">AGENT FOCUS</span>}
      </div>
      <div className="incident-summary">
        <div>
          <span className="incident-id">{snapshot.incident.id}</span>
          <strong>{scenario.incident.title}</strong>
        </div>
        <span className="severity-badge">{snapshot.incident.severity}</span>
      </div>
      <p className="customer-impact">{snapshot.incident.customerImpact}</p>
      <div className="metric-grid" aria-label="Current checkout telemetry">
        <div className="metric">
          <span>Checkout P95</span>
          <strong>{checkout.p95LatencyMs.toLocaleString()} ms</strong>
          <small>CRITICAL · baseline 310 ms</small>
        </div>
        <div className="metric">
          <span>Error rate</span>
          <strong>{checkout.errorRatePct.toFixed(1)}%</strong>
          <small>CRITICAL · baseline 0.4%</small>
        </div>
        <div className="metric">
          <span>Unhealthy</span>
          <strong>{snapshot.unhealthyServices.length}</strong>
          <small>services require attention</small>
        </div>
      </div>
      <div className="service-list" aria-label="Unhealthy services">
        {snapshot.unhealthyServices.map((service) => (
          <div className="service-row" key={service.serviceId}>
            <span className="critical-icon" aria-hidden="true">
              !
            </span>
            <strong>{service.serviceId}</strong>
            <span>{service.health.toUpperCase()}</span>
            <span>{service.p95LatencyMs.toLocaleString()} ms P95</span>
          </div>
        ))}
      </div>
      <div aria-live="polite" className="agent-action-receipt">
        {lastAgentAction ? (
          <>
            <span className="agent-chip">AGENT</span>
            <span>{lastAgentAction}</span>
            <span className="invocation-count">
              Invocation {snapshotInvocationCount}
            </span>
          </>
        ) : (
          <span>Waiting for an agent or human inspection.</span>
        )}
      </div>
    </section>
  );
};
