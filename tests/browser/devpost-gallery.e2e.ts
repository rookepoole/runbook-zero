import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

interface BrowserTool {
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

type ToolWindow = Window & { __runbookTools: Map<string, BrowserTool> };

const galleryDirectory = resolve(
  import.meta.dirname,
  "../../docs/screenshots/devpost-gallery",
);

const installModelContext = async (page: Page) => {
  await page.addInitScript(() => {
    const tools = new Map<string, BrowserTool>();
    Object.defineProperty(window, "__runbookTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: async (
          tool: BrowserTool & { name: string },
          options?: { signal?: AbortSignal },
        ) => {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener(
            "abort",
            () => {
              if (tools.get(tool.name) === tool) tools.delete(tool.name);
            },
            { once: true },
          );
        },
      },
    });
  });
};

const callTool = <T>(
  page: Page,
  name: string,
  input: Record<string, unknown>,
) =>
  page.evaluate(
    async ({ name, input }) => {
      const tool = (window as ToolWindow).__runbookTools.get(name);
      if (!tool) throw new Error(`Tool ${name} is not active.`);
      return (await tool.execute(input)) as T;
    },
    { name, input },
  );

const capture = async (page: Page, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(galleryDirectory, `${name}.png`),
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });
};

const closeFocus = async (page: Page) => {
  const focusBar = page.locator(".focus-mode-bar");
  if (await focusBar.isVisible()) await page.keyboard.press("Escape");
};

const focusPanel = async (
  page: Page,
  panel: "topology" | "telemetry" | "incident command" | "timeline",
) => {
  await closeFocus(page);
  await page.getByRole("button", { name: `Focus ${panel} panel` }).click();
  await expect(page.locator(".focus-mode-bar")).toBeVisible();
};

const launchPack = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Incident Packs" }).click();
  const card = page.getByRole("article").filter({ hasText: name });
  await card.getByRole("button", { name: "Launch incident" }).click();
};

test.use({ viewport: { width: 1500, height: 1000 } });
test.skip(
  process.env.CAPTURE_DEVPOST_GALLERY !== "1",
  "Set CAPTURE_DEVPOST_GALLERY=1 to regenerate the Devpost gallery.",
);

test("captures fifteen truthful 3:2 submission images", async ({ page }) => {
  mkdirSync(galleryDirectory, { recursive: true });
  await installModelContext(page);
  await page.goto("/");
  await expect(page.getByText("WebMCP Connected")).toBeVisible();

  await capture(page, "01-runbook-zero-incident-command");

  await focusPanel(page, "topology");
  await capture(page, "02-checkout-dependency-topology");

  await focusPanel(page, "telemetry");
  await capture(page, "03-live-telemetry-evidence");

  await callTool(page, "get_system_snapshot", {});
  await callTool(page, "trace_request_path", { flow: "checkout" });
  await callTool(page, "query_signals", {
    serviceId: "inventory-db",
    window: "30m",
  });
  await callTool(page, "get_recent_changes", {
    serviceId: "inventory",
    since: "60m",
  });
  await callTool(page, "set_working_hypothesis", {
    summary:
      "inventory-v2.7.0 reduced dbPoolSize from 80 to 12, saturating inventory-db.",
    confidence: "high",
    evidenceIds: ["CHG-271", "inventory-db.saturationPct"],
  });
  await focusPanel(page, "timeline");
  await capture(page, "04-agent-evidence-trail");

  await callTool(page, "compare_mitigations", {
    excludeKinds: ["rollback"],
    optimizeFor: "lowest-risk",
  });
  await focusPanel(page, "incident command");
  await capture(page, "05-low-risk-mitigation-comparison");

  await callTool(page, "stage_mitigation", {
    mitigationId: "M-POOL-RESTORE",
  });
  await expect(page.getByText("STAGED — NOT APPLIED")).toBeVisible();
  await focusPanel(page, "incident command");
  await capture(page, "06-exact-change-awaiting-human");

  await closeFocus(page);
  await capture(page, "07-capability-firewall-locked");

  await page.getByRole("button", { name: "Approve staged mitigation" }).click();
  await expect(page.getByText("AVAILABLE", { exact: true })).toBeVisible();
  await capture(page, "08-human-approval-unlocks-apply");

  await callTool(page, "apply_approved_mitigation", {
    mitigationId: "M-POOL-RESTORE",
  });
  await expect(page.getByText("RESOLVED").first()).toBeVisible({
    timeout: 7_000,
  });
  await callTool(page, "verify_recovery", {});
  await callTool(page, "add_incident_note", {
    note: "Pool size restored to 80; recovery thresholds passed.",
  });
  await capture(page, "09-verified-deterministic-recovery");

  await page.getByRole("button", { name: "Incident Packs" }).click();
  await capture(page, "10-generalized-incident-pack-launcher");
  await page.keyboard.press("Escape");

  await launchPack(page, "Payment event queue backlog");
  await expect(page.getByText("INC-117", { exact: true })).toBeVisible();
  await capture(page, "11-payment-queue-incident");
  await callTool(page, "compare_mitigations", {
    excludeKinds: ["rollback"],
    optimizeFor: "lowest-risk",
  });
  await callTool(page, "stage_mitigation", {
    mitigationId: "M-PAY-CONCURRENCY-RESTORE",
  });
  await page.getByRole("button", { name: "Approve staged mitigation" }).click();
  await expect(page.getByText("AVAILABLE", { exact: true })).toBeVisible();
  await capture(page, "12-same-contracts-new-incident");

  await page.getByRole("button", { name: "Reset Scenario" }).click();
  await launchPack(page, "Catalog cache stampede");
  await expect(page.getByText("INC-203", { exact: true })).toBeVisible();
  await capture(page, "13-catalog-cache-stampede");

  const root = resolve(import.meta.dirname, "../..");
  const packPath = resolve(
    tmpdir(),
    `runbook-zero-gallery-live-${process.pid}.json`,
  );
  execFileSync(process.execPath, [
    resolve(root, "plugins/runbook-zero/scripts/build-live-incident-pack.mjs"),
    "--input",
    resolve(root, "tests/fixtures/site-capture-checkout-v2.json"),
    "--output",
    packPath,
  ]);

  try {
    await page.getByRole("button", { name: "Incident Packs" }).click();
    await page.locator("#incident-pack-file").setInputFiles(packPath);
    await expect(page.getByText("LIVE SITE", { exact: true })).toBeVisible();
    await expect(page.getByText("EVIDENCE-DERIVED GRAPH")).toBeVisible();
    await capture(page, "14-live-site-evidence-derived-graph");

    await callTool(page, "get_system_snapshot", {});
    await callTool(page, "set_working_hypothesis", {
      summary:
        "The reduced checkout database pool explains the saturated order-write path.",
      confidence: "high",
      evidenceIds: ["E-CHECKOUT-TRACE", "E-POOL-SATURATION", "E-POOL-CHANGE"],
    });
    await callTool(page, "compare_mitigations", {
      optimizeFor: "lowest-risk",
    });
    await callTool(page, "stage_mitigation", {
      mitigationId: "M-RESTORE-CHECKOUT-POOL",
    });
    await page
      .getByRole("button", { name: "Approve staged mitigation" })
      .click();
    await callTool(page, "apply_approved_mitigation", {
      mitigationId: "M-RESTORE-CHECKOUT-POOL",
    });
    await expect(
      page.getByText("RELEASED TO TARGET", { exact: true }),
    ).toBeVisible();
    await capture(page, "15-approval-bound-action-receipt");
  } finally {
    rmSync(packPath, { force: true });
  }
});
