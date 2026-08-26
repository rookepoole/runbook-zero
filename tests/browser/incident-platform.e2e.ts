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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: true,
  });
};

const launchPack = async (
  page: Page,
  name: string,
  launcherAssetName?: string,
) => {
  await page.getByRole("button", { name: "Incident Packs" }).click();
  if (launcherAssetName) await captureSubmissionAsset(page, launcherAssetName);
  const card = page.getByRole("article").filter({ hasText: name });
  await card.getByRole("button", { name: "Launch incident" }).click();
};

test.beforeEach(async ({ page }) => {
  await installModelContext(page);
});

test("bundled incidents share one WebMCP surface and capability firewall", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("WebMCP Connected")).toBeVisible();
  await expect.poll(() => toolNames(page)).toHaveLength(9);
  await expect(page.getByText("Capability firewall")).toBeVisible();
  await expect(page.getByText("LOCKED", { exact: true })).toBeVisible();

  await launchPack(
    page,
    "Payment event queue backlog",
    "submission-incident-launcher",
  );
  await expect(page.getByText("INC-117", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Payment confirmation dependency graph"),
  ).toBeVisible();
  await expect.poll(() => toolNames(page)).toHaveLength(9);

  const paymentSnapshot = await callTool<{ incident: { id: string } }>(
    page,
    "get_system_snapshot",
    {},
  );
  expect(paymentSnapshot.incident.id).toBe("INC-117");
  const paymentSignals = await callTool<{
    current: { saturationPct: number };
  }>(page, "query_signals", {
    serviceId: "payment-consumer",
    window: "30m",
  });
  expect(paymentSignals.current.saturationPct).toBe(96);

  await callTool(page, "compare_mitigations", {
    excludeKinds: ["rollback"],
    optimizeFor: "lowest-risk",
  });
  await callTool(page, "stage_mitigation", {
    mitigationId: "M-PAY-CONCURRENCY-RESTORE",
  });
  await expect(page.getByText("consumerConcurrency 4 → 24")).toBeVisible();
  await expect
    .poll(() => toolNames(page))
    .not.toContain("apply_approved_mitigation");
  await expect(page.getByText("Awaiting human decision")).toBeVisible();

  await page.getByRole("button", { name: "Approve staged mitigation" }).click();
  await expect(page.getByText("AVAILABLE", { exact: true })).toBeVisible();
  await expect
    .poll(() => toolNames(page))
    .toContain("apply_approved_mitigation");
  await captureSubmissionAsset(page, "submission-capability-firewall-approved");

  await page.getByRole("button", { name: "Reset Scenario" }).click();
  await expect(page.getByText("INC-117", { exact: true })).toBeVisible();
  await expect(page.getByText("START WITH YOUR AGENT")).toBeVisible();
  await expect.poll(() => toolNames(page)).toHaveLength(9);

  await launchPack(page, "Catalog cache stampede");
  const catalogSnapshot = await callTool<{ incident: { id: string } }>(
    page,
    "get_system_snapshot",
    {},
  );
  expect(catalogSnapshot.incident.id).toBe("INC-203");
  await expect(page.getByText("Catalog browse dependency graph")).toBeVisible();
  await expect(page.getByText("LOCKED", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Incident Packs" }).click();
  await page.locator("#incident-pack-file").setInputFiles({
    name: "invalid-pack.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"name":"unsafe"}'),
  });
  await expect(page.getByText("Pack rejected safely")).toBeVisible();
  await expect(page.getByText("INC-203", { exact: true })).toBeVisible();
});
