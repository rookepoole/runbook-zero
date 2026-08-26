import { useEffect, useState } from "react";

import { detectWebMCPCapability } from "./capability";
import { registerGetSystemSnapshot } from "./registry";

export type WebMCPConnectionState =
  | { status: "connecting" }
  | { status: "connected"; activeToolCount: number }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export const useWebMCPRegistry = (): WebMCPConnectionState => {
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
    const handle = registerGetSystemSnapshot(capability.modelContext);
    void handle.registered
      .then(() => {
        if (!disposed)
          setConnection({ status: "connected", activeToolCount: 1 });
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
  }, []);

  return connection;
};
