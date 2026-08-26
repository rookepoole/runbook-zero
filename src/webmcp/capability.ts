export type WebMCPCapability =
  | { status: "available"; modelContext: WebMCPModelContext }
  | { status: "unavailable" };

export const detectWebMCPCapability = (
  targetDocument: Document,
): WebMCPCapability =>
  targetDocument.modelContext
    ? { status: "available", modelContext: targetDocument.modelContext }
    : { status: "unavailable" };
