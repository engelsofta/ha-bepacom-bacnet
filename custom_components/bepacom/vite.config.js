import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const integrationRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: "reload-safe-custom-elements",
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type !== "chunk") continue;
          output.code = output.code
            .replace(
              "customElements.define(t2, e2);\n  }) : customElements.define(t2, e2);",
              "if (!customElements.get(t2)) customElements.define(t2, e2);\n  }) : !customElements.get(t2) && customElements.define(t2, e2);",
            );
        }
      },
    },
  ],
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
