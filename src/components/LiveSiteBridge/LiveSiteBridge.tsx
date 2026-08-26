import type { IncidentSource } from "../../domain/types";

interface LiveSiteBridgeProps {
  source: IncidentSource;
  onOpenLauncher: () => void;
}

export const LiveSiteBridge = ({
  source,
  onOpenLauncher,
}: LiveSiteBridgeProps) => {
  if (source.kind === "live-site") {
    return (
      <section className="live-site-bridge live-site-bridge--connected">
        <div>
          <p className="eyebrow">Live site connection</p>
          <h1>{source.title}</h1>
          <a href={source.url} rel="noreferrer" target="_blank">
            {source.origin}
          </a>
        </div>
        <div className="live-site-bridge__facts">
          <span>LIVE SITE</span>
          <code>{source.capturedBy.replaceAll("-", " ")}</code>
          <code>{source.observedWebMCPTools.length} observed WebMCP tools</code>
          <code>{source.baselineKind.replaceAll("-", " ")}</code>
        </div>
        <p>
          Captured {new Date(source.capturedAt).toLocaleString()}. Runbook Zero
          governs the exact action; Codex executes it only on this origin after
          visible approval.
        </p>
      </section>
    );
  }

  return (
    <section className="live-site-bridge">
      <div>
        <p className="eyebrow">Codex product connection</p>
        <h1>Run this approval workflow on the site open in Codex</h1>
        <p>
          Install the plugin, inspect a real site through Codex or the Chrome
          extension, and import its evidence as a live incident—not another
          canned walkthrough.
        </p>
      </div>
      <div className="install-command" aria-label="Codex install commands">
        <code>codex plugin marketplace add rookepoole/runbook-zero</code>
        <code>codex plugin add runbook-zero@runbook-zero</code>
      </div>
      <button type="button" onClick={onOpenLauncher}>
        Connect a live site
      </button>
    </section>
  );
};
