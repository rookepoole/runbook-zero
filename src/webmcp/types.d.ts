interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface WebMCPExecutionContext {
  signal: AbortSignal;
}

interface WebMCPTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: WebMCPToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    context?: WebMCPExecutionContext,
  ) => unknown | Promise<unknown>;
}

interface WebMCPRegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: string;
  annotations?: WebMCPToolAnnotations;
  origin: string;
  window: Window;
}

interface WebMCPModelContext extends EventTarget {
  registerTool: (
    tool: WebMCPTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ) => Promise<void>;
  getTools?: (options?: {
    fromOrigins?: string[];
  }) => Promise<WebMCPRegisteredTool[]>;
  executeTool?: (
    tool: WebMCPRegisteredTool,
    input: string,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
}

interface Document {
  readonly modelContext?: WebMCPModelContext;
}
