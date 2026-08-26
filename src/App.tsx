import "./App.css";
import { SystemOverview } from "./components/SystemOverview/SystemOverview";
import { WebMCPStatus } from "./components/WebMCPStatus/WebMCPStatus";
import { useRunbookStore } from "./state/store";
import { useWebMCPRegistry } from "./webmcp/use-webmcp-registry";

function App() {
  const connection = useWebMCPRegistry();
  const scenario = useRunbookStore((state) => state.scenario);
  const resetScenario = useRunbookStore((state) => state.resetScenario);

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
          <strong>{scenario.incident.status.toUpperCase()}</strong>
        </div>
        <button type="button" className="reset-button" onClick={resetScenario}>
          Reset Scenario
        </button>
        <WebMCPStatus connection={connection} />
      </header>
      <main>
        <div className="gate-label">
          <span>CHALLENGE EDITION</span>
          <h1>Shared incident command surface</h1>
          <p>
            Live system state and a phase-aware WebMCP tool surface shared by
            the operator and agent.
          </p>
        </div>
        <SystemOverview />
      </main>
    </div>
  );
}

export default App;
