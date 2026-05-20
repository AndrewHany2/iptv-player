import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
