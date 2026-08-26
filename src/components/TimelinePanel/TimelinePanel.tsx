import { useRunbookStore } from "../../state/store";

export const TimelinePanel = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const change = scenario.changes[0];

  return (
    <section
      aria-labelledby="timeline-heading"
      className={`workspace-panel timeline-panel${focusedSurface === "timeline" ? " workspace-panel--agent-focus" : ""}`}
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Change + incident timeline</p>
          <h2 id="timeline-heading">Evidence trail</h2>
        </div>
        <span className="mono-label">
          {scenario.timeline.length + 1} EVENTS
        </span>
      </div>
      <ol className="timeline-list">
        <li className="timeline-item timeline-item--change">
          <div>
            <span className="system-chip">SYSTEM</span>
            <time>{change.timestamp.slice(11, 16)} UTC</time>
          </div>
          <strong>{change.summary}</strong>
          <code>dbPoolSize 80 → 12</code>
        </li>
        {[...scenario.timeline].reverse().map((event) => (
          <li
            className={`timeline-item timeline-item--${event.actor}`}
            key={event.id}
          >
            <div>
              <span className={`${event.actor}-chip`}>
                {event.actor.toUpperCase()}
              </span>
              <time>{event.timestamp.slice(11, 16)} UTC</time>
            </div>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};
