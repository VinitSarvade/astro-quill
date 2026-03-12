# Astro Quill

Astro Quill is an intelligent, developer-friendly content editing studio shipped as an Astro integration. By injecting a lightweight React SPA right into your Astro site at `/studio`, you unlock a seamless content workflow: you and your team can log in, edit markdown, interact with an AI to format or structure your content, and publish straight to GitHub with Pull Requests.

It is designed to "live where you work", running entirely inside your Astro server locally or hosted, parsing the standard `src/content` directory. The footprint on your host project is minimal—Tailwind CSS styles are self-contained and precompiled.

## Features

- **No CMS Required:** Content stays locally in your GitHub repository inside `src/content/`.
- **AI Content Editor:** Chat interface powered by Vercel AI SDK. Seamlessly tell the AI (OpenAI, Anthropic, or OpenRouter) to reformat, clarify, or edit your `.md`/`.mdx` directly in your workspace.
- **Git Native workflow:** Make changes in the interface and click Publish. Astro Quill leverages Octokit to instantly push your changes to a new branch and open a PR. You can tie this PR to preview deployments on Vercel or Netlify.
- **Lightweight Backend:** Built-in Auth with JWTs, File viewing APIs, and Markdown preview.

## Requirements

- Astro v3+
- Your Astro project must have a **Server Adapter** (e.g., `@astrojs/node` or `@astrojs/vercel`) configured in `astro.config.mjs`. Astro Quill injects dynamic API endpoints that require Server-Side Rendering (SSR). You can keep `output: 'static'` if you prefer, as Astro 5+ supports mixing static and SSR pages easily.
- Node.js 18+ or Bun
- React (`@astrojs/react`) integration
- GitHub API Token
- AI Provider API Key (OpenAI or Anthropic)

## Installation

Install using your preferred package manager:

```sh
npm install astro-quill
# or
bun add astro-quill
```

Update your `astro.config.mjs` to add the integration. Make sure you also have the `@astrojs/react` integration setup (CSS is handled by Astro Quill internally!).

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import studio from "astro-quill";

export default defineConfig({
  integrations: [
    react(),
    studio({
      password: process.env.STUDIO_PASSWORD,
      ai: {
        provider: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      github: {
        token: process.env.GITHUB_TOKEN,
        owner: "your-github-org",
        repo: "your-repository-name",
        baseBranch: "main",
      },
    }),
  ],
});
```

## Security

The `/studio` API endpoints injected by the Astro Quill integration are protected by an `httpOnly` secure JWT cookie, authenticated by the strong `password` you enforce via the configuration.

Ensure to not check-in `password`, `github.token`, or `ai.apiKey` into your codebase. They should be set strictly by `.env` variables or secrets in production.
