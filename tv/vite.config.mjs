import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Targets older webOS (Chromium 38+) and other TV browsers
      targets: ["chrome >= 38", "not dead"],
      // Polyfill modern APIs used by React 19 + Supabase
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      modernPolyfills: true,
    }),
  ],
  // Relative asset paths so the app loads correctly from file:// protocol
  // (Android assets, Samsung .wgt, LG .ipk — no web server needed)
  base: "./",
  server: {
    port: 3002,
    host: true,
  },
  build: {
    outDir: "dist",
  },
});
