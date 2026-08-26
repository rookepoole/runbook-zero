import { useRunbookStore } from "../../state/store";

const formatConfigValue = (value: unknown) =>
  value === null ? "null" : String(value);

const Sparkline = ({
  baseline,
  current,
  label,
}: {
  baseline: number;
  current: number;
  label: string;
}) => {
  const spread = current - baseline;
  const values = [
    baseline,
    baseline * 0.98,
    baseline * 1.04,
    baseline + spread * 0.16,
    baseline + spread * 0.45,
    baseline + spread * 0.78,
    current,
  ];
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => `${index * 16.67},${28 - (value / max) * 24}`)
    .join(" ");
  const baselineY = 28 - (baseline / max) * 24;

  return (
    <svg
      className="sparkline"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label} trend from baseline ${baseline} to current ${current}`}
    >
      <line
        className="sparkline__baseline"
        x1="0"
        y1={baselineY}
        x2="100"
        y2={baselineY}
      />
      <line className="sparkline__change" x1="67" y1="2" x2="67" y2="30" />
      <polyline className="sparkline__line" points={points} />
      <circle
        className="sparkline__point"
        cx="100"
        cy={28 - (current / max) * 24}
        r="2"
      />
    </svg>
  );
};

export const TelemetryPanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const focusProvenance = useRunbookStore((state) => state.focusProvenance);
  const selectedServiceId = useRunbookStore((state) => state.selectedServiceId);
  const toggleFocus = useRunbookStore((state) => state.toggleHumanFocus);
  const current = scenario.services[selectedServiceId];
  const baseline = scenario.baselineServices[selectedServiceId];
  const isFocused = focusedSurface === "telemetry";
  const isAgentFocused = isFocused && focusProvenance === "agent";
  const relatedEvidence = scenario.evidence.filter((item) =>
    item.serviceIds.includes(selectedServiceId),
  );
  const relatedChange = scenario.changes.find((change) =>
    relatedEvidence.some((item) => item.id === change.id),
  );
  const changeMarker = scenario.changes[0]?.timestamp.slice(11, 16) ?? "n/a";
  const metrics = [
    {
      label: "P95 latency",
      value: current.p95LatencyMs,
      formatted: `${current.p95LatencyMs.toLocaleString()} ms`,
      baseline: baseline.p95LatencyMs,
      baselineFormatted: `${baseline.p95LatencyMs} ms`,
      delta: `${current.p95LatencyMs >= baseline.p95LatencyMs ? "+" : ""}${current.p95LatencyMs - baseline.p95LatencyMs} ms`,
    },
    {
      label: "Error rate",
      value: current.errorRatePct,
      formatted: `${current.errorRatePct.toFixed(1)}%`,
      baseline: baseline.errorRatePct,
      baselineFormatted: `${baseline.errorRatePct.toFixed(1)}%`,
      delta: `${current.errorRatePct >= baseline.errorRatePct ? "+" : ""}${(current.errorRatePct - baseline.errorRatePct).toFixed(1)} pp`,
    },
    {
      label: "Saturation",
      value: current.saturationPct,
      formatted: `${current.saturationPct}%`,
      baseline: baseline.saturationPct,
      baselineFormatted: `${baseline.saturationPct}%`,
      delta: `${current.saturationPct >= baseline.saturationPct ? "+" : ""}${current.saturationPct - baseline.saturationPct} pp`,
    },
    {
      label: "Throughput",
      value: current.requestsPerSecond,
      formatted: `${current.requestsPerSecond} rps`,
      baseline: baseline.requestsPerSecond,
      baselineFormatted: `${baseline.requestsPerSecond} rps`,
      delta: `${current.requestsPerSecond >= baseline.requestsPerSecond ? "+" : ""}${current.requestsPerSecond - baseline.requestsPerSecond} rps`,
    },
  ];

  return (
    <section
      aria-labelledby="telemetry-heading"
      className={`workspace-panel telemetry-panel${isAgentFocused ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Telemetry / signals</p>
          <h2 id="telemetry-heading">{selectedServiceId}</h2>
        </div>
        <div className="panel-actions">
          <span className={`health-label health-label--${current.health}`}>
            {current.health === "critical"
              ? "!"
              : current.health === "degraded"
                ? "△"
                : "✓"}{" "}
            {current.health.toUpperCase()}
          </span>
          <button
            type="button"
            className="focus-button"
            aria-label={`${isFocused ? "Exit" : "Focus"} telemetry panel`}
            onClick={() => toggleFocus("telemetry")}
          >
            {isFocused ? "Collapse" : "Focus"}
          </button>
        </div>
      </div>
      <div className="signal-grid">
        {metrics.map((metric) => (
          <div
            className={`signal-card signal-card--${current.health}`}
            key={metric.label}
          >
            <div className="signal-card__label">
              <span>{metric.label}</span>
              <small
                className={
                  metric.value > metric.baseline
                    ? "metric-delta metric-delta--bad"
                    : "metric-delta metric-delta--good"
                }
              >
                {metric.delta}
              </small>
            </div>
            <strong>{metric.formatted}</strong>
            <Sparkline
              baseline={metric.baseline}
              current={metric.value}
              label={metric.label}
            />
            <small>
              baseline {metric.baselineFormatted} · change marker {changeMarker}
            </small>
          </div>
        ))}
      </div>
      <div className="evidence-detail-grid">
        <div>
          <span className="section-label">Observed at</span>
          <code>
            {current.timestamp.replace("T", " ").replace(".000Z", " UTC")}
          </code>
        </div>
        <div>
          <span className="section-label">Evidence IDs</span>
          <code>
            {relatedEvidence.map((item) => item.id).join(" · ") ||
              `${selectedServiceId}.telemetry`}
          </code>
        </div>
        <div>
          <span className="section-label">Baseline model</span>
          <code>known-good deterministic seed {scenario.seed}</code>
        </div>
      </div>
      {relatedChange && (
        <div className="config-evidence">
          <span className="section-label">Correlated change</span>
          <strong>{relatedChange.summary}</strong>
          {Object.entries(relatedChange.diff).map(([field, change]) => {
            const appliedAction =
              scenario.stagedMitigation?.status === "applied"
                ? scenario.stagedMitigation.option.exactActions.find(
                    (action) => action.field === field,
                  )
                : undefined;
            const active = Object.hasOwn(scenario.systemConfig, field)
              ? scenario.systemConfig[field]
              : (appliedAction?.to ?? change.to);
            const knownGood = Object.hasOwn(scenario.baselineConfig, field)
              ? scenario.baselineConfig[field]
              : change.from;
            const restored = active === knownGood;
            return restored ? (
              <code className="config-restored" key={field}>
                ✓ restored to {formatConfigValue(active)} · {field}
              </code>
            ) : (
              <code key={field}>
                <del>
                  known-good: {formatConfigValue(knownGood)} · {field}
                </del>{" "}
                <ins>
                  active: {formatConfigValue(active)} · {field}
                </ins>
              </code>
            );
          })}
        </div>
      )}
    </section>
  );
};
