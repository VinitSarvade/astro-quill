import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    alias: {
      "virtual:astro-quill/config": "./src/__mocks__/virtual-config.ts",
      "virtual:astro-quill/server": "./src/__mocks__/virtual-server.ts",
    },
  },
});
