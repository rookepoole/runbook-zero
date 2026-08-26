import { useEffect, useState } from "react";

import "./App.css";
import { CapabilityFirewall } from "./components/CapabilityFirewall/CapabilityFirewall";
import { IncidentCommand } from "./components/IncidentCommand/IncidentCommand";
import { IncidentLauncher } from "./components/IncidentLauncher/IncidentLauncher";
import { LiveSiteBridge } from "./components/LiveSiteBridge/LiveSiteBridge";
import { TelemetryPanel } from "./components/TelemetryPanel/TelemetryPanel";
import { TimelinePanel } from "./components/TimelinePanel/TimelinePanel";
import { TopologyPanel } from "./components/TopologyPanel/TopologyPanel";
import { WebMCPStatus } from "./components/WebMCPStatus/WebMCPStatus";
import { useRunbookStore } from "./state/store";
import { useWebMCPRegistry } from "./webmcp/use-webmcp-registry";

function App() {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const connection = useWebMCPRegistry();
  const scenario = useRunbookStore((state) => state.scenario);
  const resetScenario = useRunbookStore((state) => state.resetScenario);
  const lastAgentAction = useRunbookStore((state) => state.lastAgentAction);
  const focusedSurface = useRunbookStore((state) => state.focusedSurface);
  const focusProvenance = useRunbookStore((state) => state.focusProvenance);
  const clearFocus = useRunbookStore((state) => state.clearFocus);
  const advanceRecoveryFrame = useRunbookStore(
    (state) => state.advanceRecoveryFrame,
  );
  const recoveryStep = scenario.recovery?.step;

  useEffect(() => {
    if (scenario.phase !== "MITIGATING" || recoveryStep === undefined) return;
    const timeout = window.setTimeout(advanceRecoveryFrame, 1_000);
    return () => window.clearTimeout(timeout);
  }, [advanceRecoveryFrame, recoveryStep, scenario.phase]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (launcherOpen) setLauncherOpen(false);
      else clearFocus();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clearFocus, launcherOpen]);

  const unhealthyServices = Object.values(scenario.services).filter(
    (service) => service.health !== "healthy",
  );
  const highestP95 = Math.max(
    ...Object.values(scenario.services).map((service) => service.p95LatencyMs),
  );
  const highestErrorRate = Math.max(
    ...Object.values(scenario.services).map((service) => service.errorRatePct),
  );
  const focusedPanel =
    focusedSurface === "system-overview" ? "incident-command" : focusedSurface;

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
        <div
          className={`header-incident${scenario.phase === "RESOLVED" ? " header-incident--resolved" : ""}`}
        >
          <span>{scenario.incident.id}</span>
          <b>{scenario.incident.severity}</b>
          <strong>{scenario.phase.replaceAll("_", "-")}</strong>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="reset-button"
            onClick={resetScenario}
          >
            Reset Scenario
          </button>
          <button
            type="button"
            className="launcher-button"
            onClick={() => setLauncherOpen(true)}
          >
            Incident Packs
          </button>
        </div>
        <WebMCPStatus connection={connection} />
      </header>
      <main>
        <LiveSiteBridge
          source={scenario.pack.source}
          onOpenLauncher={() => setLauncherOpen(true)}
        />
        <div className="workspace-context">
          <div>
            <span>LIVE INCIDENT WORKSPACE</span>
            <strong>{scenario.incident.customerImpact}</strong>
          </div>
          <span
            className={`phase-badge${scenario.phase === "RESOLVED" ? " phase-badge--resolved" : ""}`}
          >
            {scenario.phase.replaceAll("_", " ")}
          </span>
        </div>
        <div className="triage-strip" aria-label="Incident at-a-glance">
          <div>
            <span>Impact path</span>
            <strong>{scenario.pack.impactPath}</strong>
          </div>
          <div>
            <span>Unhealthy</span>
            <strong>
              {unhealthyServices.length} /{" "}
              {Object.keys(scenario.services).length} services
            </strong>
          </div>
          <div>
            <span>Highest P95</span>
            <strong>{highestP95.toLocaleString()} ms</strong>
          </div>
          <div>
            <span>Highest errors</span>
            <strong>{highestErrorRate.toFixed(1)}%</strong>
          </div>
          <div>
            <span>Authority</span>
            <strong>
              {scenario.stagedMitigation?.status === "released"
                ? "Released to target site"
                : scenario.stagedMitigation?.status === "applied"
                  ? "Applied after approval"
                  : scenario.stagedMitigation?.status === "approved"
                    ? "Human approved"
                    : scenario.stagedMitigation?.status === "staged"
                      ? "Awaiting human"
                      : "No change staged"}
            </strong>
          </div>
        </div>
        <CapabilityFirewall connection={connection} />
        {focusedPanel && (
          <div className={`focus-mode-bar focus-mode-bar--${focusProvenance}`}>
            <span>
              {focusProvenance === "agent" ? "AGENT FOCUS" : "FOCUS MODE"} ·{" "}
              {focusedPanel.replaceAll("-", " ")}
            </span>
            <button type="button" onClick={clearFocus}>
              Close · Esc
            </button>
          </div>
        )}
        <div
          className={`workspace-grid${focusedPanel ? ` workspace-grid--focus-${focusedPanel}` : ""}`}
        >
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
      <IncidentLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
      />
    </div>
  );
}

export default App;
