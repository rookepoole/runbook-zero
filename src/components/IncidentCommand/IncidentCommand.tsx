import { useRunbookStore } from "../../state/store";

export const IncidentCommand = () => {
  const scenario = useRunbookStore((state) => state.scenario);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const focusProvenance = useRunbookStore((state) => state.focusProvenance);
  const toggleFocus = useRunbookStore((state) => state.toggleHumanFocus);
  const approve = useRunbookStore((state) => state.approveStagedMitigation);
  const discard = useRunbookStore(
    (state) => state.discardStagedMitigationAsHuman,
  );
  const comparison = scenario.mitigationComparison;
  const staged = scenario.stagedMitigation;
  const isAgentFocused =
    (focusedSurface === "incident-command" ||
      focusedSurface === "system-overview") &&
    focusProvenance === "agent";
  const isFocused =
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
        <div className="panel-actions">
          {isAgentFocused && <span className="agent-chip">AGENT FOCUS</span>}
          <button
            type="button"
            className="focus-button"
            aria-label={`${isFocused ? "Exit" : "Focus"} incident command panel`}
            onClick={() => toggleFocus("incident-command")}
          >
            {isFocused ? "Collapse" : "Focus"}
          </button>
        </div>
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
            <div>
              <p>{scenario.incident.workingHypothesis}</p>
              <div className="evidence-chips" aria-label="Hypothesis evidence">
                <span>
                  {scenario.incident.hypothesisConfidence?.toUpperCase() ??
                    "MEDIUM"}{" "}
                  CONFIDENCE
                </span>
                {(scenario.incident.hypothesisEvidenceIds ?? []).map((id) => (
                  <code key={id}>{id}</code>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="agent-start-card">
            <div className="agent-start-card__heading">
              <span className="agent-chip">START WITH YOUR AGENT</span>
              <span className="mono-label">WEBMCP HANDOFF</span>
            </div>
            <p>In a WebMCP-capable browser, ask your agent:</p>
            <blockquote>
              Checkout latency spiked after this morning&apos;s deployment. Find
              the likely cause. Don&apos;t change production yet.
            </blockquote>
            <small>
              Agent calls will focus and update this same workspace. Production
              cannot change before visible human approval of an exact staged
              mitigation.
            </small>
          </div>
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
                  <small>
                    {option.predictedErrorRatePct}% errors · reversible{" "}
                    {option.reversible ? "yes" : "no"}
                  </small>
                  <p>{option.description}</p>
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
                staged.status === "approved"
                  ? "human-chip"
                  : staged.status === "applied"
                    ? "applied-chip"
                    : "staged-chip"
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
          <div className="approval-scope">
            <span>Approval scope</span>
            <code>
              {staged.incidentId} · seed {staged.scenarioSeed} · {staged.id}
            </code>
          </div>
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
          <div className="assumption-list">
            <span className="section-label">Simulation assumptions</span>
            {staged.option.assumptions.map((assumption) => (
              <p key={assumption}>• {assumption}</p>
            ))}
          </div>
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
