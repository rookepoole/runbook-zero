import { useEffect, useRef } from "react";

import type { IncidentPack } from "../../domain/types";
import { useRunbookStore } from "../../state/store";

interface IncidentLauncherProps {
  open: boolean;
  onClose: () => void;
}

export const IncidentLauncher = ({ open, onClose }: IncidentLauncherProps) => {
  const packs = useRunbookStore((state) => state.incidentPacks);
  const activePackId = useRunbookStore((state) => state.activePackId);
  const importError = useRunbookStore((state) => state.importError);
  const loadPack = useRunbookStore((state) => state.loadIncidentPack);
  const importPack = useRunbookStore((state) => state.importIncidentPackJson);
  const dismissImportError = useRunbookStore(
    (state) => state.dismissImportError,
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [open]);

  if (!open) return null;

  const choosePack = (packId: string) => {
    loadPack(packId);
    onClose();
  };

  const downloadPack = (pack: IncidentPack) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${pack.packId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    dismissImportError();
    if (file.size > 1_000_000) {
      importPack(" ".repeat(1_000_001));
      return;
    }
    const result = importPack(await file.text());
    if (result.ok) onClose();
  };

  return (
    <div className="launcher-backdrop" role="presentation">
      <section
        aria-labelledby="incident-launcher-heading"
        aria-modal="true"
        className="incident-launcher"
        ref={dialogRef}
        role="dialog"
      >
        <div className="incident-launcher__heading">
          <div>
            <p className="eyebrow">Incident platform</p>
            <h2 id="incident-launcher-heading">Launch an Incident Pack</h2>
          </div>
          <button
            type="button"
            className="focus-button"
            onClick={onClose}
            ref={closeButtonRef}
          >
            Close
          </button>
        </div>
        <p className="launcher-intro">
          Every pack runs through the same domain commands, WebMCP tools,
          capability firewall, and human approval boundary.
        </p>
        <section className="live-import-guide" aria-label="Connect a live site">
          <div>
            <span className="agent-chip">LIVE SITE · CODEX PLUGIN</span>
            <h3>Bring the website you are actually using</h3>
            <p>
              The installable plugin captures bounded evidence from the site
              open in Codex or the Chrome extension, then builds a locally
              importable pack with the target origin and exact available
              actions.
            </p>
          </div>
          <div className="live-import-guide__commands">
            <code>codex plugin marketplace add rookepoole/runbook-zero</code>
            <code>codex plugin add runbook-zero@runbook-zero</code>
            <blockquote>Use Runbook Zero to investigate this site.</blockquote>
          </div>
          <small>
            Site content is treated as untrusted evidence. Cross-origin action
            execution remains in Codex and is released only after visible human
            approval here.
          </small>
        </section>
        <details className="pack-contract">
          <summary>Incident Pack v1 contract</summary>
          <p>
            A pack declares incident metadata, services, topology, baseline and
            current telemetry, changes, evidence, exact mitigation actions,
            risks, reversibility, thresholds, and deterministic recovery frames.
            Imports are limited to 1 MB and rejected before activation if any
            reference is invalid.
          </p>
        </details>
        <div className="incident-pack-grid">
          {packs.map((pack) => (
            <article
              className={`incident-pack-card${pack.packId === activePackId ? " incident-pack-card--active" : ""}`}
              key={pack.packId}
            >
              <div>
                <span
                  className={
                    pack.canonical || pack.source?.kind === "live-site"
                      ? "agent-chip"
                      : "mono-label"
                  }
                >
                  {pack.source?.kind === "live-site"
                    ? "LIVE SITE"
                    : pack.canonical
                      ? "CANONICAL DEMO"
                      : "INCIDENT PACK"}
                </span>
                {pack.packId === activePackId && (
                  <span className="active-pack-chip">ACTIVE</span>
                )}
              </div>
              <h3>{pack.name}</h3>
              <p>{pack.summary}</p>
              <small>
                {pack.incident.id} · seed {pack.seed} ·{" "}
                {Object.keys(pack.services).length} services
              </small>
              {pack.source?.kind === "live-site" && (
                <small>{pack.source.origin}</small>
              )}
              <div className="pack-card-actions">
                <button type="button" onClick={() => downloadPack(pack)}>
                  Download JSON
                </button>
                <button
                  type="button"
                  disabled={pack.packId === activePackId}
                  onClick={() => choosePack(pack.packId)}
                >
                  {pack.packId === activePackId
                    ? "Currently loaded"
                    : "Launch incident"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="incident-import">
          <div>
            <span className="section-label">Local JSON import</span>
            <strong>Import a generated live-site or deterministic pack</strong>
            <small>
              Validated locally in this browser. The file is never uploaded.
            </small>
          </div>
          <input
            accept="application/json,.json"
            id="incident-pack-file"
            onChange={(event) => void handleImport(event.target.files?.[0])}
            type="file"
          />
          <label className="import-button" htmlFor="incident-pack-file">
            Import JSON
          </label>
        </div>
        {importError && (
          <div className="import-error" role="alert">
            <strong>Pack rejected safely</strong>
            <span>{importError}</span>
          </div>
        )}
      </section>
    </div>
  );
};
