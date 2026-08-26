import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/dist/**", "**/playwright-report/**", "**/test-results/**"],
    },
  },
  plugins: [
    react(),
    sites(),
    cloudflare({ viteEnvironment: { name: "server" } }),
  ],
});
