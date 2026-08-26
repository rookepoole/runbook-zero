import type { StagedMitigation } from "../../domain/types";
import { useRunbookStore } from "../../state/store";
import { getRegisteredToolNames } from "../../webmcp/registry";
import type { WebMCPConnectionState } from "../../webmcp/use-webmcp-registry";

interface CapabilityFirewallProps {
  connection: WebMCPConnectionState;
}

const authorityState = (status: StagedMitigation | null) => {
  if (status?.status === "approved") return "Human approved exact stage";
  if (status?.status === "applied") return "Applied after approval";
  if (status?.status === "staged") return "Awaiting human decision";
  return "No consequential change authorized";
};

export const CapabilityFirewall = ({ connection }: CapabilityFirewallProps) => {
  const scenario = useRunbookStore((state) => state.scenario);
  const activeNames =
    connection.status === "connected" ? getRegisteredToolNames(scenario) : [];
  const applyAvailable = activeNames.includes("apply_approved_mitigation");
  const applyReason = applyAvailable
    ? `Available only for ${scenario.stagedMitigation?.id}.`
    : scenario.stagedMitigation?.status === "staged"
      ? "Locked until the visible human approval is recorded."
      : scenario.stagedMitigation?.status === "applied"
        ? "Removed immediately after the approved action began."
        : "Locked because no exact staged mitigation has human approval.";

  return (
    <section
      className={`capability-firewall${applyAvailable ? " capability-firewall--open" : ""}`}
      aria-labelledby="capability-firewall-heading"
    >
      <div className="capability-firewall__summary">
        <div>
          <p className="eyebrow">Agent capability surface</p>
          <h2 id="capability-firewall-heading">Capability firewall</h2>
        </div>
        <div className="capability-authority">
          <span>phase · {scenario.phase.toLowerCase()}</span>
          <strong>{authorityState(scenario.stagedMitigation)}</strong>
        </div>
      </div>
      <div
        className="capability-firewall__active"
        aria-label="Active WebMCP capabilities"
      >
        <span className="section-label">ACTIVE · {activeNames.length}</span>
        <div className="capability-chip-list">
          {activeNames.map((name) => (
            <code key={name}>{name}</code>
          ))}
          {connection.status !== "connected" && (
            <small>WebMCP connection required for agent capabilities.</small>
          )}
        </div>
      </div>
      <div className="capability-firewall__consequential">
        <span
          className={applyAvailable ? "capability-open" : "capability-locked"}
        >
          {applyAvailable ? "AVAILABLE" : "LOCKED"}
        </span>
        <code>apply_approved_mitigation</code>
        <small>{applyReason}</small>
        <span className="capability-human-only">HUMAN ONLY</span>
        <code>approve staged mitigation</code>
      </div>
    </section>
  );
};
