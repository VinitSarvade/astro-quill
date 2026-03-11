import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/integration/index.ts", "src/virtual/config.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["astro", "@octokit/rest", "@anthropic-ai/sdk", "virtual:astro-quill/config"],
});
