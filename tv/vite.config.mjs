import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// TV devices load files via file:// protocol which blocks type="module" scripts.
// Strip it from the built HTML so the IIFE bundle loads without MIME errors.
const removeModuleType = () => ({
  name: "remove-module-type",
  transformIndexHtml(html, ctx) {
    if (!ctx.bundle) return html; // dev server — leave type="module" intact
    return html.replaceAll(`<script type="module"`, "<script defer");
  },
});

export default defineConfig({
  plugins: [react(), removeModuleType()],

  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },

  base: "./",

  build: {
    outDir: "dist",

    target: "es2015",
    minify: "esbuild",

    sourcemap: false,

    rollupOptions: {
      output: {
        format: "iife",
        name: "TVApp",
      },
    },
  },
});
