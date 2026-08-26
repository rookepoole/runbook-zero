import { describe, expect, it } from "vitest";
import { detectWebMCPCapability } from "../../src/webmcp/capability";

describe("detectWebMCPCapability", () => {
  it("reports unavailable without document.modelContext", () => {
    expect(detectWebMCPCapability({} as Document)).toEqual({
      status: "unavailable",
    });
  });
  it("returns the real model context when present", () => {
    const modelContext = new EventTarget() as WebMCPModelContext;
    expect(detectWebMCPCapability({ modelContext } as Document)).toEqual({
      status: "available",
      modelContext,
    });
  });
});
