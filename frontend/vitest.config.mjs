import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    loader: "jsx",
    include: /.*\.[jt]sx?$/,
    exclude: [],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
  },
});
