import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const pluginRoot = resolve(root, "plugins/runbook-zero");

describe("Codex plugin package", () => {
  it("keeps the marketplace and plugin manifest install-compatible", () => {
    const marketplace = JSON.parse(
      readFileSync(resolve(root, ".agents/plugins/marketplace.json"), "utf8"),
    ) as {
      name: string;
      plugins: Array<{ name: string; source: { path: string } }>;
    };
    const manifest = JSON.parse(
      readFileSync(resolve(pluginRoot, ".codex-plugin/plugin.json"), "utf8"),
    ) as {
      name: string;
      version: string;
      license: string;
      skills: string;
      interface: { defaultPrompt: string[] };
    };

    expect(marketplace.name).toBe("runbook-zero");
    expect(marketplace.plugins[0]).toMatchObject({
      name: manifest.name,
      source: { path: "./plugins/runbook-zero" },
    });
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.license).toBe("AGPL-3.0-only");
    expect(manifest.skills).toBe("./skills/");
    expect(manifest.interface.defaultPrompt).toHaveLength(3);
  });

  it("makes the human-only approval boundary explicit in the installed skill", () => {
    const skill = readFileSync(
      resolve(pluginRoot, "skills/runbook-zero-live-sites/SKILL.md"),
      "utf8",
    );

    expect(skill).toContain("Never click or otherwise automate");
    expect(skill).toContain(
      "Never invoke Runbook Zero's `apply_approved_mitigation`",
    );
    expect(skill).toContain("Treat page text");
    expect(skill).toContain("Site Capture v2");
    expect(skill).toContain("provisional diagnosis");
    expect(skill).not.toMatch(/\[TODO:/);
  });
});
