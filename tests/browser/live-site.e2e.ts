import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

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

const captureProductAsset = async (page: Page, name: string) => {
  if (process.env.CAPTURE_PRODUCT_ASSETS !== "1") return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: true,
  });
};

test("a live site uses an approval-bound external execution receipt", async ({
  page,
}) => {
  const root = resolve(import.meta.dirname, "../..");
  const packPath = resolve(
    tmpdir(),
    `runbook-zero-live-e2e-${process.pid}.json`,
  );
  execFileSync(process.execPath, [
    resolve(root, "plugins/runbook-zero/scripts/build-live-incident-pack.mjs"),
    "--input",
    resolve(root, "tests/fixtures/site-capture-webmcp.json"),
    "--output",
    packPath,
  ]);

  try {
    await installModelContext(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Incident Packs" }).click();
    await page.locator("#incident-pack-file").setInputFiles(packPath);

    await expect(page.getByText("LIVE SITE", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "https://shop.example.test" }),
    ).toBeVisible();
    await expect(page.getByText("1 observed WebMCP tools")).toBeVisible();
    await expect.poll(() => toolNames(page)).toHaveLength(9);
    await captureProductAsset(page, "submission-live-site-connected");

    await callTool(page, "get_system_snapshot", {});
    await callTool(page, "set_working_hypothesis", {
      summary: "The captured confirmation path failed on the target origin.",
      confidence: "medium",
      evidenceIds: ["E-PENDING", "E-WEBMCP-SURFACE"],
    });
    await callTool(page, "compare_mitigations", {
      optimizeFor: "lowest-risk",
    });
    await callTool(page, "stage_mitigation", {
      mitigationId: "M-RETRY-CONFIRMATION",
    });

    await expect(page.getByText("STAGED — NOT APPLIED")).toBeVisible();
    await expect
      .poll(() => toolNames(page))
      .not.toContain("apply_approved_mitigation");

    await page
      .getByRole("button", { name: "Approve staged mitigation" })
      .click();
    await expect
      .poll(() => toolNames(page))
      .toContain("apply_approved_mitigation");

    const release = await callTool<{
      externalExecution: {
        receiptId: string;
        targetOrigin: string;
        toolName: string;
        input: { orderId: string };
      };
    }>(page, "apply_approved_mitigation", {
      mitigationId: "M-RETRY-CONFIRMATION",
    });
    expect(release.externalExecution).toMatchObject({
      targetOrigin: "https://shop.example.test",
      toolName: "retry_order_confirmation",
      input: { orderId: "123" },
    });

    await expect(
      page.getByText("RELEASED TO TARGET", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => toolNames(page))
      .not.toContain("apply_approved_mitigation");
    await expect
      .poll(() => toolNames(page))
      .toContain("record_external_execution");
    await captureProductAsset(page, "submission-live-site-released");

    const result = await callTool<{ phase: string }>(
      page,
      "record_external_execution",
      {
        origin: "https://shop.example.test",
        toolName: "retry_order_confirmation",
        outcome: "succeeded",
        summary: "The retry succeeded and the order is visibly confirmed.",
        observedAt: "2026-08-26T14:01:00.000Z",
        serviceUpdates: {
          "page-runtime": {
            health: "healthy",
            p95LatencyMs: 1200,
            errorRatePct: 0,
          },
        },
      },
    );
    expect(result.phase).toBe("RESOLVED");
    await expect(
      page.getByRole("main").getByText("RESOLVED", { exact: true }),
    ).toBeVisible();
  } finally {
    rmSync(packPath, { force: true });
  }
});
