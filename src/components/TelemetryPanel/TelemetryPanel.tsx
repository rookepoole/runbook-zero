import { useRunbookStore } from "../../state/store";

export const TelemetryPanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const selectedServiceId = useRunbookStore((state) => state.selectedServiceId);
  const current = scenario.services[selectedServiceId];
  const baseline = scenario.baselineServices[selectedServiceId];
  const metrics = [
    [
      "P95 latency",
      `${current.p95LatencyMs.toLocaleString()} ms`,
      `${baseline.p95LatencyMs} ms`,
    ],
    [
      "Error rate",
      `${current.errorRatePct.toFixed(1)}%`,
      `${baseline.errorRatePct.toFixed(1)}%`,
    ],
    ["Saturation", `${current.saturationPct}%`, `${baseline.saturationPct}%`],
    [
      "Throughput",
      `${current.requestsPerSecond} rps`,
      `${baseline.requestsPerSecond} rps`,
    ],
  ];

  return (
    <section
      aria-labelledby="telemetry-heading"
      className={`workspace-panel telemetry-panel${focusedSurface === "telemetry" ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Telemetry / signals</p>
          <h2 id="telemetry-heading">{selectedServiceId}</h2>
        </div>
        <span className={`health-label health-label--${current.health}`}>
          {current.health === "critical"
            ? "!"
            : current.health === "degraded"
              ? "△"
              : "✓"}{" "}
          {current.health.toUpperCase()}
        </span>
      </div>
      <div className="signal-grid">
        {metrics.map(([label, value, baselineValue]) => (
          <div className="signal-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>baseline {baselineValue}</small>
          </div>
        ))}
      </div>
      {(selectedServiceId === "inventory" ||
        selectedServiceId === "inventory-db") && (
        <div className="config-evidence">
          <span className="section-label">Active deployment evidence</span>
          <strong>inventory-v2.7.0</strong>
          <code>
            <del>dbPoolSize: 80</del> <ins>dbPoolSize: 12</ins>
          </code>
        </div>
      )}
    </section>
  );
};
