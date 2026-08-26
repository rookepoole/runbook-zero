import { useState } from "react";

import type { TimelineEvent } from "../../domain/types";
import { useRunbookStore } from "../../state/store";

type TimelineFilter = "all" | TimelineEvent["actor"] | "change";

const emptyFilterMessage: Partial<Record<TimelineFilter, string>> = {
  agent:
    "No agent actions yet. Start with the agent brief in Incident command.",
  human:
    "No human actions yet. Human approval appears after an agent stages a mitigation.",
};

export const TimelinePanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const focusProvenance = useRunbookStore((state) => state.focusProvenance);
  const toggleFocus = useRunbookStore((state) => state.toggleHumanFocus);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const isFocused = focusedSurface === "timeline";
  const isAgentFocused = isFocused && focusProvenance === "agent";
  const events = [...scenario.timeline]
    .reverse()
    .filter((event) => filter === "all" || event.actor === filter);
  const showChange =
    filter === "all" || filter === "system" || filter === "change";

  return (
    <section
      aria-labelledby="timeline-heading"
      className={`workspace-panel timeline-panel${isAgentFocused ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Change + incident timeline</p>
          <h2 id="timeline-heading">Evidence trail</h2>
        </div>
        <div className="panel-actions">
          <span className="mono-label">
            {scenario.timeline.length + scenario.changes.length} EVENTS
          </span>
          <button
            type="button"
            className="focus-button"
            aria-label={`${isFocused ? "Exit" : "Focus"} timeline panel`}
            onClick={() => toggleFocus("timeline")}
          >
            {isFocused ? "Collapse" : "Focus"}
          </button>
        </div>
      </div>
      <div className="timeline-filters" aria-label="Filter evidence trail">
        {(["all", "agent", "human", "system", "change"] as const).map(
          (value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ),
        )}
      </div>
      <ol className="timeline-list">
        {showChange &&
          scenario.changes.map((change) => (
            <li className="timeline-item timeline-item--change" key={change.id}>
              <div>
                <span className="system-chip">CHANGE</span>
                <time>{change.timestamp.slice(11, 16)} UTC</time>
                <code>{change.id}</code>
              </div>
              <strong>{change.summary}</strong>
              <p>
                {change.category} · {change.author} ·{" "}
                {change.risk.toUpperCase()} RISK
              </p>
              <details>
                <summary>Inspect exact change</summary>
                <dl className="timeline-detail">
                  <div>
                    <dt>Service</dt>
                    <dd>{change.serviceId}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{change.version ?? "configuration"}</dd>
                  </div>
                  {Object.entries(change.diff).flatMap(([field, values]) => [
                    <div key={`${field}-before`}>
                      <dt>Before</dt>
                      <dd>
                        {field} {String(values.from)}
                      </dd>
                    </div>,
                    <div key={`${field}-after`}>
                      <dt>After</dt>
                      <dd>
                        {field} {String(values.to)}
                      </dd>
                    </div>,
                  ])}
                </dl>
              </details>
            </li>
          ))}
        {events.map((event) => (
          <li
            className={`timeline-item timeline-item--${event.actor}`}
            key={event.id}
          >
            <div>
              <span className={`${event.actor}-chip`}>
                {event.actor.toUpperCase()}
              </span>
              <time>{event.timestamp.slice(11, 16)} UTC</time>
              <code>{event.id}</code>
            </div>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
            <small>
              {event.type.toUpperCase()} · deterministic scenario event
            </small>
          </li>
        ))}
      </ol>
      {events.length === 0 && !showChange && (
        <p className="empty-state empty-state--guidance">
          {emptyFilterMessage[filter] ??
            `No ${filter} evidence is available in this incident state.`}
        </p>
      )}
    </section>
  );
};
