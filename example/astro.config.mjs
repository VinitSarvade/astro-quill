// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import node from "@astrojs/node";
import studio from "astro-quill";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  output: "static",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    mdx(),
    sitemap(),
    react(),
    studio({
      password: process.env.STUDIO_PASSWORD || "secret",
      ai: {
        provider: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      github: {
        token: process.env.GITHUB_TOKEN,
        owner: "your-org",
        repo: "example-repo",
        baseBranch: "main",
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
