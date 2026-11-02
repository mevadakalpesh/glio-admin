import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "ADMIN_");
  return {
    plugins: [react(), tailwindcss()],
    // Keep development prebundles separate from test runner cache changes.
    cacheDir: "node_modules/.cache/gilo-vite",
    optimizeDeps: { include: ["@googlemaps/js-api-loader", "@base-ui/react/menu", "@base-ui/react/button", "@base-ui/react/popover", "@base-ui/react/switch", "react-day-picker"] },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api/admin/v1": {
          target: env.ADMIN_API_TARGET || "http://127.0.0.1:3000",
          changeOrigin: false,
        },
      },
    },
  };
});
