import { expect, test, type Page } from "@playwright/test";

interface BrowserTool {
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
}

type ToolWindow = Window & { __runbookTools: Map<string, BrowserTool> };

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

const toolNames = (page: Page) =>
  page.evaluate(() => [...(window as ToolWindow).__runbookTools.keys()]);

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

const captureSubmissionAsset = async (page: Page, name: string) => {
  if (process.env.CAPTURE_SUBMISSION_ASSETS !== "1") return;
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: true,
  });
};

test.beforeEach(async ({ page }) => {
  await installModelContext(page);
});

test("canonical reset-to-resolved journey preserves human authority", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByText("WebMCP Connected")).toBeVisible();
  await expect(page.getByText("SEV-2")).toBeVisible();
  await expect.poll(() => toolNames(page)).toHaveLength(9);
  await captureSubmissionAsset(page, "submission-incident-open");

  const snapshot = await callTool<{
    incident: { id: string };
    unhealthyServices: unknown[];
  }>(page, "get_system_snapshot", {});
  expect(snapshot.incident.id).toBe("INC-042");
  expect(snapshot.unhealthyServices).toHaveLength(4);

  const trace = await callTool<{ primaryPath: string[] }>(
    page,
    "trace_request_path",
    { flow: "checkout" },
  );
  expect(trace.primaryPath).toEqual([
    "edge",
    "gateway",
    "checkout",
    "inventory",
    "inventory-db",
  ]);

  const signals = await callTool<{
    current: { saturationPct: number };
    baseline: { saturationPct: number };
  }>(page, "query_signals", { serviceId: "inventory-db", window: "30m" });
  expect(signals.current.saturationPct).toBe(97);
  expect(signals.baseline.saturationPct).toBe(45);

  const changes = await callTool<Array<{ diff: unknown }>>(
    page,
    "get_recent_changes",
    { serviceId: "inventory", since: "60m" },
  );
  expect(changes[0].diff).toEqual({ dbPoolSize: { from: 80, to: 12 } });

  await callTool(page, "set_working_hypothesis", {
    summary:
      "inventory-v2.7.0 reduced dbPoolSize from 80 to 12, saturating inventory-db.",
    confidence: "high",
    evidenceIds: ["CHG-271", "inventory-db.saturationPct"],
  });
  await expect(
    page.getByText(/reduced dbPoolSize from 80 to 12/).first(),
  ).toBeVisible();

  const candidates = await callTool<Array<{ id: string }>>(
    page,
    "compare_mitigations",
    { excludeKinds: ["rollback"], optimizeFor: "lowest-risk" },
  );
  expect(candidates.map(({ id }) => id)).toEqual([
    "M-POOL-RESTORE",
    "M-CACHE-DEGRADE",
  ]);
  await expect(page.getByText("ROLLBACK EXCLUDED")).toBeVisible();

  await callTool(page, "stage_mitigation", {
    mitigationId: "M-POOL-RESTORE",
  });
  await expect(page.getByText("STAGED — NOT APPLIED")).toBeVisible();
  await expect(page.getByText("dbPoolSize 12 → 80")).toBeVisible();
  await expect
    .poll(() => toolNames(page))
    .not.toContain("apply_approved_mitigation");
  await captureSubmissionAsset(page, "submission-staged-not-applied");

  await page.getByRole("button", { name: "Approve staged mitigation" }).click();
  await expect(page.getByText("✓ HUMAN APPROVED")).toBeVisible();
  await expect
    .poll(() => toolNames(page))
    .toContain("apply_approved_mitigation");
  await expect(
    page.getByText("M-POOL-RESTORE approved by human"),
  ).toBeVisible();
  await captureSubmissionAsset(page, "submission-human-approved");

  const applied = await callTool<{ phase: string }>(
    page,
    "apply_approved_mitigation",
    { mitigationId: "M-POOL-RESTORE" },
  );
  expect(applied.phase).toBe("MITIGATING");
  await expect
    .poll(() => toolNames(page))
    .not.toContain("apply_approved_mitigation");

  await expect(page.getByText("RESOLVED").first()).toBeVisible({
    timeout: 7_000,
  });
  const verification = await callTool<{ recovered: boolean }>(
    page,
    "verify_recovery",
    {},
  );
  expect(verification.recovered).toBe(true);
  await callTool(page, "add_incident_note", {
    note: "Pool size restored to 80; recovery thresholds passed.",
  });
  await expect(
    page.getByText("Pool size restored to 80; recovery thresholds passed."),
  ).toBeVisible();
  await captureSubmissionAsset(page, "submission-resolved");

  await page.getByRole("button", { name: "Reset Scenario" }).click();
  await expect(page.getByText("INCIDENT OPEN")).toBeVisible();
  await expect(page.getByText("4,700 ms")).toBeVisible();
  await expect(
    page.getByText("Waiting for evidence-backed diagnosis."),
  ).toBeVisible();
  await expect.poll(() => toolNames(page)).toHaveLength(9);
  expect(consoleErrors).toEqual([]);
});

test("target layouts, keyboard access, and reduced motion remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByText("WebMCP Connected")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    transitionDuration: getComputedStyle(
      document.querySelector(".workspace-panel") as Element,
    ).transitionDuration,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  expect(["0.01ms", "1e-05s"]).toContain(dimensions.transitionDuration);

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Reset Scenario" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("INCIDENT OPEN")).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/TODO|lorem ipsum|placeholder/i);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByText("Checkout dependency path")).toBeVisible();
  await expect(page.getByText("Evidence trail")).toBeVisible();
});
