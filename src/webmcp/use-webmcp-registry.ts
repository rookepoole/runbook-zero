import { useEffect, useState } from "react";

import { useRunbookStore } from "../state/store";
import { detectWebMCPCapability } from "./capability";
import { registerToolsForPhase } from "./registry";

export type WebMCPConnectionState =
  | { status: "connecting" }
  | { status: "connected"; activeToolCount: number }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export const useWebMCPRegistry = (): WebMCPConnectionState => {
  const phase = useRunbookStore((state) => state.scenario.phase);
  const [connection, setConnection] = useState<WebMCPConnectionState>(() =>
    detectWebMCPCapability(document).status === "available"
      ? { status: "connecting" }
      : { status: "unavailable" },
  );

  useEffect(() => {
    const capability = detectWebMCPCapability(document);
    if (capability.status === "unavailable") {
      return;
    }

    let disposed = false;
    const handle = registerToolsForPhase(capability.modelContext, phase);
    void handle.registered
      .then(() => {
        if (!disposed)
          setConnection({
            status: "connected",
            activeToolCount: handle.names.length,
          });
      })
      .catch((error: unknown) => {
        if (!disposed)
          setConnection({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Tool registration failed.",
          });
      });

    return () => {
      disposed = true;
      handle.unregister();
    };
  }, [phase]);

  return connection;
};
