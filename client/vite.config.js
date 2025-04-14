import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { coreJsModules } from "./src/core-js-shim";

// Create aliases for each core-js module
const aliases = Object.keys(coreJsModules).reduce((acc, modulePath) => {
  acc[modulePath] = path.resolve(__dirname, "src/core-js-shim.js");
  return acc;
}, {});

// List of core-js modules causing issues
const coreJsModulesList = [
  "core-js/modules/es.promise.js",
  "core-js/modules/es.string.match.js",
  "core-js/modules/es.string.replace.js",
  "core-js/modules/es.string.starts-with.js",
  "core-js/modules/es.array.iterator.js",
  "core-js/modules/web.dom-collections.iterator.js",
  "core-js/modules/es.array.reduce.js",
  "core-js/modules/es.string.ends-with.js",
  "core-js/modules/es.string.split.js",
  "core-js/modules/es.string.trim.js",
  "core-js/modules/es.array.index-of.js",
  "core-js/modules/es.string.includes.js",
  "core-js/modules/es.array.reverse.js",
  "core-js/modules/es.regexp.to-string.js",
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib/utils": path.resolve(__dirname, "./src/lib/utils.js"),
      ...aliases,
      // Add core-js alias to help Bun locate these modules
      "core-js": path.resolve(__dirname, "node_modules/core-js"),
      "core-js/modules/es.promise.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.match.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.replace.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.starts-with.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.array.iterator.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/web.dom-collections.iterator.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.array.reduce.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.ends-with.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.split.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.trim.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.array.index-of.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.string.includes.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.array.reverse.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
      "core-js/modules/es.regexp.to-string.js": path.resolve(
        __dirname,
        "src/core-js-shim.js"
      ),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Mark problematic modules as external to prevent errors
      external: coreJsModulesList,
    },
    // Tell Vite to exclude these problematic imports from transformation
    exclude: ["canvg"],
  },
  build: {
    rollupOptions: {
      // Only one external key here - no duplicates
      external: coreJsModulesList,
    },
    commonjsOptions: {
      include: [/core-js/, /node_modules/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:30000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
