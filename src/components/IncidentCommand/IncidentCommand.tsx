import { useRunbookStore } from "../../state/store";

export const IncidentCommand = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const approve = useRunbookStore((state) => state.approveStagedMitigation);
  const discard = useRunbookStore(
    (state) => state.discardStagedMitigationAsHuman,
  );
  const comparison = scenario.mitigationComparison;
  const staged = scenario.stagedMitigation;
  const isAgentFocused =
    focusedSurface === "incident-command" ||
    focusedSurface === "system-overview";

  return (
    <section
      aria-labelledby="incident-command-heading"
      className={`workspace-panel incident-command${isAgentFocused ? " workspace-panel--agent-focus" : ""}`}
      data-testid="system-overview"
    >
      <div className="workspace-panel__heading">
        <div>
          <p className="eyebrow">Incident command</p>
          <h2 id="incident-command-heading">{scenario.incident.title}</h2>
        </div>
        {isAgentFocused && <span className="agent-chip">AGENT FOCUS</span>}
      </div>

      <div className="impact-strip">
        <span className="critical-icon" aria-hidden="true">
          !
        </span>
        <p>{scenario.incident.customerImpact}</p>
      </div>

      <div className="command-section">
        <span className="section-label">Working hypothesis</span>
        {scenario.incident.workingHypothesis ? (
          <div className="hypothesis-card">
            <span className="agent-chip">AGENT</span>
            <p>{scenario.incident.workingHypothesis}</p>
          </div>
        ) : (
          <p className="empty-state">Waiting for evidence-backed diagnosis.</p>
        )}
      </div>

      {comparison && !staged && (
        <div className="command-section">
          <div className="section-label-row">
            <span className="section-label">Mitigation comparison</span>
            <span className="constraint-chip">
              {comparison.excludeKinds.includes("rollback")
                ? "ROLLBACK EXCLUDED"
                : comparison.optimizeFor.toUpperCase()}
            </span>
          </div>
          <div className="candidate-list">
            {comparison.candidateIds.map((id, index) => {
              const option = scenario.mitigationOptions[id];
              return (
                <article className="candidate-card" key={id}>
                  <span>
                    {index === 0 ? "RECOMMENDED" : `OPTION ${index + 1}`}
                  </span>
                  <strong>{option.title}</strong>
                  <small>
                    {option.risk.toUpperCase()} RISK · {option.predictedP95Ms}{" "}
                    ms predicted P95 · {option.estimatedRecoverySeconds}s
                    recovery
                  </small>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {staged && (
        <article
          className={`approval-card approval-card--${staged.status}`}
          aria-label="Staged mitigation review"
        >
          <div className="approval-card__heading">
            <span
              className={
                staged.status === "approved" ? "human-chip" : "staged-chip"
              }
            >
              {staged.status === "approved"
                ? "✓ HUMAN APPROVED"
                : staged.status === "applied"
                  ? "APPLIED"
                  : "STAGED — NOT APPLIED"}
            </span>
            <span className="mono-label">{staged.id}</span>
          </div>
          <h3>{staged.option.title}</h3>
          <p>{staged.option.description}</p>
          <dl className="approval-facts">
            <div>
              <dt>Exact change</dt>
              <dd>dbPoolSize 12 → 80</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>inventory</dd>
            </div>
            <div>
              <dt>Predicted P95</dt>
              <dd>{staged.option.predictedP95Ms} ms</dd>
            </div>
            <div>
              <dt>Error rate</dt>
              <dd>{staged.option.predictedErrorRatePct}%</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{staged.option.risk.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Reversible</dt>
              <dd>{staged.option.reversible ? "YES" : "NO"}</dd>
            </div>
          </dl>
          {scenario.phase === "AWAITING_HUMAN_APPROVAL" && (
            <div className="approval-actions">
              <button
                type="button"
                className="approve-button"
                onClick={() => approve(staged.id)}
              >
                Approve staged mitigation
              </button>
              <button
                type="button"
                className="discard-button"
                onClick={discard}
              >
                Discard
              </button>
            </div>
          )}
          {scenario.phase === "APPROVED" && (
            <p className="approval-boundary-note">
              Human approval recorded. The agent may now apply this exact
              mitigation.
            </p>
          )}
          {scenario.phase === "MITIGATING" && scenario.recovery && (
            <div className="recovery-progress" aria-live="polite">
              <span>
                Recovery frame {scenario.recovery.step} /{" "}
                {scenario.recovery.totalSteps}
              </span>
              <progress
                aria-label="Deterministic recovery progress"
                max={scenario.recovery.totalSteps}
                value={scenario.recovery.step}
              />
            </div>
          )}
          {scenario.phase === "RESOLVED" && (
            <p className="resolved-note">
              ✓ Recovery thresholds satisfied · incident resolved
            </p>
          )}
        </article>
      )}
    </section>
  );
};
