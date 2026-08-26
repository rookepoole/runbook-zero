import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["tests/browser/**", "node_modules/**"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
