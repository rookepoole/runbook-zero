import type { WebMCPConnectionState } from "../../webmcp/use-webmcp-registry";

interface WebMCPStatusProps {
  connection: WebMCPConnectionState;
}

export const WebMCPStatus = ({ connection }: WebMCPStatusProps) => {
  if (connection.status === "connected") {
    return (
      <div className="webmcp-status webmcp-status--connected" role="status">
        <span aria-hidden="true" className="status-dot" />
        <span>WebMCP Connected</span>
        <span className="tool-count">
          {connection.activeToolCount}{" "}
          {connection.activeToolCount === 1 ? "tool" : "tools"} active
        </span>
      </div>
    );
  }
  if (connection.status === "error") {
    return (
      <div className="webmcp-status webmcp-status--error" role="status">
        <span aria-hidden="true" className="status-dot" />
        <span>WebMCP registration error</span>
        <span className="status-detail">{connection.message}</span>
      </div>
    );
  }
  if (connection.status === "unavailable") {
    return (
      <div className="webmcp-status webmcp-status--unavailable" role="status">
        <span aria-hidden="true" className="status-dot" />
        <span>WebMCP unavailable</span>
        <span className="status-detail">Human controls remain available.</span>
      </div>
    );
  }
  return (
    <div className="webmcp-status" role="status">
      <span aria-hidden="true" className="status-dot" />
      <span>Connecting WebMCP…</span>
    </div>
  );
};
