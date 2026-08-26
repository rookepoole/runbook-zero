import type { CSSProperties } from "react";

import { traceRequestPath } from "../../domain/queries";
import type { ServiceId } from "../../domain/types";
import { useRunbookStore } from "../../state/store";

const SERVICE_POSITIONS: Record<ServiceId, { x: number; y: number }> = {
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
};

const healthIcon = { healthy: "✓", degraded: "△", critical: "!" } as const;

export const TopologyPanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const focusProvenance = useRunbookStore((state) => state.focusProvenance);
  const selectedServiceId = useRunbookStore((state) => state.selectedServiceId);
  const tracedFlow = useRunbookStore((state) => state.tracedFlow);
  const selectService = useRunbookStore((state) => state.selectService);
  const toggleFocus = useRunbookStore((state) => state.toggleHumanFocus);
  const isFocused = focusedSurface === "topology";
  const isAgentFocused = isFocused && focusProvenance === "agent";
  const trace = tracedFlow ? traceRequestPath(scenario, tracedFlow) : null;
  const tracedServices = new Set(trace?.primaryPath ?? []);
  const selectedService = scenario.services[selectedServiceId];
  const dependencies = scenario.topology[selectedServiceId];
  const upstreams = Object.entries(scenario.topology)
    .filter(([, downstreams]) => downstreams.includes(selectedServiceId))
    .map(([serviceId]) => serviceId);
  const edges = Object.entries(scenario.topology).flatMap(
    ([from, downstreams]) =>
      downstreams.map((to) => ({ from: from as ServiceId, to })),
  );

  return (
    <section
      aria-labelledby="topology-heading"
      className={`workspace-panel topology-panel${isAgentFocused ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Service topology</p>
          <h2 id="topology-heading">Checkout dependency graph</h2>
        </div>
        <div className="panel-actions">
          {tracedFlow && (
            <span className="agent-chip">AGENT TRACE · {tracedFlow}</span>
          )}
          <button
            type="button"
            className="focus-button"
            aria-label={`${isFocused ? "Exit" : "Focus"} topology panel`}
            onClick={() => toggleFocus("topology")}
          >
            {isFocused ? "Collapse" : "Focus"}
          </button>
        </div>
      </div>
      <div className="topology-canvas" aria-label="Service dependency topology">
        <svg
          className="topology-edges"
          viewBox="0 0 100 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow"
              markerHeight="4"
              markerWidth="4"
              orient="auto"
              refX="3"
              refY="2"
            >
              <path d="M0,0 L4,2 L0,4 Z" />
            </marker>
          </defs>
          {edges.map(({ from, to }) => {
            const start = SERVICE_POSITIONS[from];
            const end = SERVICE_POSITIONS[to];
            const traced = tracedServices.has(from) && tracedServices.has(to);
            return (
              <path
                key={`${from}-${to}`}
                className={
                  traced
                    ? "topology-edge topology-edge--traced"
                    : "topology-edge"
                }
                d={`M ${start.x + 14} ${start.y + 7} C ${start.x + 17} ${start.y + 7}, ${end.x - 3} ${end.y + 7}, ${end.x} ${end.y + 7}`}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>
        {(Object.keys(SERVICE_POSITIONS) as ServiceId[]).map((serviceId) => {
          const service = scenario.services[serviceId];
          const traced = tracedServices.has(serviceId);
          const position = SERVICE_POSITIONS[serviceId];
          return (
            <button
              type="button"
              key={serviceId}
              style={
                {
                  "--node-x": `${position.x}%`,
                  "--node-y": `${position.y}%`,
                } as CSSProperties
              }
              className={`topology-node topology-node--${service.health}${traced ? " topology-node--traced" : ""}${selectedServiceId === serviceId ? " topology-node--selected" : ""}`}
              onClick={() => selectService(serviceId)}
              aria-pressed={selectedServiceId === serviceId}
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
      <div className="topology-inspector">
        <div>
          <span className="section-label">Selected service</span>
          <strong>{selectedServiceId}</strong>
          <small>
            {healthIcon[selectedService.health]}{" "}
            {selectedService.health.toUpperCase()}
          </small>
        </div>
        <div>
          <span className="section-label">Upstream</span>
          <code>{upstreams.join(", ") || "entry point"}</code>
        </div>
        <div>
          <span className="section-label">Dependencies</span>
          <code>{dependencies.join(", ") || "none"}</code>
        </div>
        <div>
          <span className="section-label">Trace evidence</span>
          <code>
            {trace
              ? `${trace.primaryPath.length} hops · ${trace.unhealthyServices.length} unhealthy`
              : "Run trace_request_path"}
          </code>
        </div>
      </div>
      <div className="topology-legend">
        <span>Click any node to inspect exact signals</span>
        <span>Blue path = agent trace · solid ring = selected</span>
      </div>
    </section>
  );
};
