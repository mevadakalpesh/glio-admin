import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  plugins: [react()],
  cacheDir: "node_modules/.cache/gilo-vitest",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Bound jsdom concurrency so timer-based UI checks remain reliable on developer machines.
  test: { maxWorkers: 2, environment: "jsdom", include: ["src/**/*.test.tsx"] },
});
