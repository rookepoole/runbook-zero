import { useEffect } from "react";

import "./App.css";
import { IncidentCommand } from "./components/IncidentCommand/IncidentCommand";
import { TelemetryPanel } from "./components/TelemetryPanel/TelemetryPanel";
import { TimelinePanel } from "./components/TimelinePanel/TimelinePanel";
import { TopologyPanel } from "./components/TopologyPanel/TopologyPanel";
import { WebMCPStatus } from "./components/WebMCPStatus/WebMCPStatus";
import { useRunbookStore } from "./state/store";
import { useWebMCPRegistry } from "./webmcp/use-webmcp-registry";

function App() {
  const connection = useWebMCPRegistry();
  const scenario = useRunbookStore((state) => state.scenario);
  const resetScenario = useRunbookStore((state) => state.resetScenario);
  const lastAgentAction = useRunbookStore((state) => state.lastAgentAction);
  const advanceRecoveryFrame = useRunbookStore(
    (state) => state.advanceRecoveryFrame,
  );
  const recoveryStep = scenario.recovery?.step;

  useEffect(() => {
    if (scenario.phase !== "MITIGATING" || recoveryStep === undefined) return;
    const timeout = window.setTimeout(advanceRecoveryFrame, 1_000);
    return () => window.clearTimeout(timeout);
  }, [advanceRecoveryFrame, recoveryStep, scenario.phase]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            R0
          </span>
          <div>
            <p>RUNBOOK ZERO</p>
            <span>Human + agent incident command</span>
          </div>
        </div>
        <div className="header-incident">
          <span>{scenario.incident.id}</span>
          <strong>{scenario.phase.replaceAll("_", "-")}</strong>
        </div>
        <button type="button" className="reset-button" onClick={resetScenario}>
          Reset Scenario
        </button>
        <WebMCPStatus connection={connection} />
      </header>
      <main>
        <div className="workspace-context">
          <div>
            <span>LIVE INCIDENT WORKSPACE</span>
            <strong>{scenario.incident.customerImpact}</strong>
          </div>
          <span className="phase-badge">
            {scenario.phase.replaceAll("_", " ")}
          </span>
        </div>
        <div className="workspace-grid">
          <TopologyPanel />
          <IncidentCommand />
          <TelemetryPanel />
          <TimelinePanel />
        </div>
      </main>
      {lastAgentAction && (
        <div className="agent-toast" role="status">
          <span className="agent-chip">AGENT ACTION</span>
          <span>{lastAgentAction}</span>
        </div>
      )}
    </div>
  );
}

export default App;
