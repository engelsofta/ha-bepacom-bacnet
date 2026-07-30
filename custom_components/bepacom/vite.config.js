import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const integrationRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: integrationRoot,
  build: {
    emptyOutDir: false,
    lib: {
      entry: "frontend/src/bepacom-panel.ts",
      formats: ["es"],
      fileName: () => "bepacom-panel.js",
    },
    outDir: "frontend",
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
