# astro-quill — Product Plan

> An Astro integration that ships a content editing studio at `/studio`. Editors log in, browse markdown content files, use AI to make changes, and publish via GitHub PR — triggering a preview deployment before anything goes live.

---

## 1. Problem

Astro sites are fast and developer-friendly, but content editors have no good way to update markdown files without touching code or Git directly. Existing CMS solutions (Contentful, Sanity) require migrating away from markdown and the file system entirely. There is no lightweight, markdown-native editing layer that works alongside an existing Astro project.

---

## 2. Solution

`astro-quill` is an Astro integration that adds a `/studio` route to any Astro site. It gives non-technical editors a browser-based interface to:

- Browse and edit markdown content files
- Use AI chat to describe changes in plain English (AI edits only the markdown, never the HTML or layout)
- Preview changes via a GitHub PR and Vercel/Netlify preview deployment
- Publish by merging the PR, triggering a production redeploy

The developer experience is minimal: install the package, add it to `astro.config.mjs`, set three env vars, done.

---

## 3. Core Principles

**Markdown is the source of truth.** The plugin never introduces a database or proprietary content format. All content lives as `.md` / `.mdx` files in `src/content`, committed to Git like everything else.

**AI edits markdown only.** The AI is given the raw markdown of the current file and the user's instruction. It returns only updated markdown. It never touches frontmatter unless explicitly asked, and never touches layout, components, or HTML.

**GitHub is the audit trail.** Every change goes through a PR. Nothing is written directly to `main`. Editors get a preview URL before anything is live, and every change is reversible.

**Zero infrastructure for v1.** No database, no separate backend service. Auth is a single env var password. Sessions are signed JWTs in an httpOnly cookie. The plugin runs entirely within the Astro SSR server.

**SSR is handled internally.** The integration automatically configures hybrid mode so only `/studio/*` routes run server-side. The rest of the site stays fully static. The user never needs to touch `output` in their config.

---

## 4. User Flow

```
1. Editor visits yoursite.com/studio
2. Enters studio password → receives signed JWT cookie (7-day session)
3. Sees file tree of src/content/**/*.md grouped by collection
4. Selects a file → sees split view: rendered preview (left) + raw markdown (right)
5. Types a change request into the AI chat panel
   → "Make the intro more concise"
   → "Add a FAQ section with 3 questions about pricing"
   → "Change all mentions of 'users' to 'customers'"
6. AI returns updated markdown → preview re-renders live
7. Editor iterates until satisfied
8. Clicks "Create Preview"
   → Plugin creates a GitHub branch: studio/edit-{timestamp}
   → Commits the changed .md file
   → Opens a PR with a summary of changes
   → Vercel / Netlify builds a preview URL from the PR
9. Plugin polls PR status, surfaces the preview URL in the studio
10. Editor (or reviewer) visits preview URL, approves
11. Clicks "Publish" in the studio → plugin merges the PR
12. Production redeploys automatically
```

---

## 5. Architecture

### 5.1 Package Structure

```
astro-quill/
├── package.json
├── README.md
│
├── integration/
│   └── index.ts              # Astro integration entrypoint — injects routes + middleware
│
├── server/
│   ├── auth.ts               # Password validation, JWT signing/verification
│   ├── files.ts              # Read src/content/** from disk, return file tree + file contents
│   ├── github.ts             # GitHub API: read file, create branch, commit, open PR, merge PR
│   └── ai.ts                 # Proxy to Anthropic API — key never leaves the server
│
├── studio/
│   ├── StudioApp.tsx         # Root component — handles routing between views
│   ├── Login.tsx             # Password form
│   ├── Sidebar.tsx           # File tree grouped by Astro content collection
│   ├── Editor.tsx            # Split view: rendered preview + raw markdown
│   ├── AiChat.tsx            # Chat panel — sends markdown + prompt, receives updated markdown
│   └── PreviewBar.tsx        # Create Preview → PR → preview URL → Publish
│
└── virtual/
    └── config.ts             # Virtual Astro module for injecting user config
```

### 5.2 API Routes

All routes are mounted under `/studio/api/` and protected by JWT middleware (except `/auth`).

| Route                             | Method | Description                                              |
| --------------------------------- | ------ | -------------------------------------------------------- |
| `/studio/api/auth`                | POST   | Validate password, set signed JWT cookie                 |
| `/studio/api/files`               | GET    | Return file tree of `src/content`                        |
| `/studio/api/files/[path]`        | GET    | Return raw markdown of a specific file                   |
| `/studio/api/ai`                  | POST   | Send markdown + prompt to Claude, return edited markdown |
| `/studio/api/preview`             | POST   | Create GitHub branch + commit + PR, return PR URL        |
| `/studio/api/preview/[pr]/status` | GET    | Poll PR for preview deployment URL                       |
| `/studio/api/publish`             | POST   | Merge PR                                                 |

### 5.3 Integration Config

```ts
// astro.config.mjs
import studio from "astro-quill";

export default defineConfig({
  // No output config needed — the integration handles hybrid mode internally
  integrations: [
    studio({
      password: process.env.STUDIO_PASSWORD,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      github: {
        token: process.env.GITHUB_TOKEN,
        owner: "your-org",
        repo: "your-site",
        baseBranch: "main",
      },
    }),
  ],
});
```

The integration calls `updateConfig({ output: 'hybrid' })` internally via the `astro:config:setup` hook, opting only `/studio/*` routes into SSR. Everything else on the site remains static.

### 5.4 Environment Variables

```bash
STUDIO_PASSWORD=your-editor-password
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

---

## 6. Authentication

v1 uses a single shared password stored in an environment variable.

**Flow:**

1. Editor submits password via login form
2. `POST /studio/api/auth` compares `req.body.password === process.env.STUDIO_PASSWORD`
3. On match: signs a JWT (`jose`, HS256, 7-day expiry), sets it as an `httpOnly; SameSite=Strict` cookie
4. All subsequent `/studio/api/*` requests verify the cookie server-side
5. Invalid or expired token → 401 → redirect to login

**Why not Better Auth?**
Better Auth requires a database and session table. For a single-editor or small-team internal tool, this is unnecessary infrastructure. The JWT approach is stateless, works on Vercel/Netlify edge, and requires zero setup beyond an env var. Better Auth (or any OAuth provider) can be added in v2 as an optional adapter.

---

## 7. AI Editing

The AI layer is intentionally constrained.

**What the AI receives:**

- The full raw markdown of the current file
- The user's natural language instruction

**What the AI returns:**

- Only the updated markdown string — no explanation, no code fences, no preamble

**System prompt (enforced server-side):**

```
You are a content editor for a markdown-based website.
The user will describe a change. Apply it to the markdown below.
Return ONLY the updated markdown. No explanation. No code fences.
Do not modify frontmatter unless the user explicitly asks.
Do not add HTML. Do not change layout or structure beyond what is asked.
```

**Why server-side proxy?**
The Anthropic API key never leaves the server. The `/studio/api/ai` route handles the request, keeping the key out of the browser entirely.

---

## 8. GitHub PR Flow

```
Editor clicks "Create Preview"
  → POST /studio/api/preview { filePath, markdownContent }
  → Server calls GitHub API:
      1. GET current file SHA from baseBranch
      2. Create branch: studio/edit-{unix-timestamp}
      3. Commit updated file to new branch
      4. Open PR:
           title: "Content edit: {filename}"
           body:  "Edited via astro-quill\n\nFile: {path}\n\nChanges: {AI-generated summary}"
  → Return: { prUrl, prNumber, branch }

Preview deployment (Vercel / Netlify)
  → Detects new PR automatically (standard PR preview behavior)
  → Builds preview URL: https://your-site-git-studio-edit-xyz.vercel.app

Studio polls GET /studio/api/preview/{pr}/status
  → Checks PR for deployment status via GitHub Deployments API
  → Once available, surfaces preview URL in the studio UI

Editor approves → clicks "Publish"
  → POST /studio/api/publish { prNumber }
  → Server merges PR (squash merge)
  → Branch deleted
  → Production redeploys
```

No Vercel or Netlify API keys are needed — preview deployments are a native feature of both platforms triggered by any PR on the connected repo.

---

## 9. Tech Stack

| Layer            | Choice                      | Reason                                              |
| ---------------- | --------------------------- | --------------------------------------------------- |
| Integration API  | Astro integration           | Native, injects virtual routes + middleware cleanly |
| Auth             | `jose` (JWT)                | Lightweight, stateless, no DB required              |
| GitHub           | `@octokit/rest`             | Official, fully typed                               |
| AI               | Anthropic SDK (server-side) | Key stays on server, simple streaming support       |
| Studio UI        | React (Astro island)        | Full React ecosystem, can use hooks and state       |
| Markdown preview | `marked`                    | Fast, no runtime, outputs clean HTML                |
| Styling          | CSS Modules or vanilla CSS  | No Tailwind dependency imposed on the host site     |

---

## 10. Build Roadmap

### Phase 1 — Core (v0.1)

- [ ] Package scaffold: `package.json`, TypeScript config, Astro integration entrypoint
- [ ] Auth: password comparison, JWT signing, cookie middleware
- [ ] File API: read `src/content` directory tree, return file contents
- [ ] AI API: proxy Anthropic call, strict system prompt, return markdown only
- [ ] Studio UI: login → file tree → split editor → AI chat

### Phase 2 — Publish Flow (v0.2)

- [ ] GitHub integration: branch, commit, PR creation via Octokit
- [ ] Preview URL polling: GitHub Deployments API
- [ ] Publish: PR merge
- [ ] PreviewBar component in studio UI

### Phase 3 — Polish (v0.3)

- [ ] Diff view: highlight what the AI changed in the markdown
- [ ] Edit history: list of past AI edits per file (in-memory per session)
- [ ] Frontmatter editor: simple key/value form for editing frontmatter fields
- [ ] MDX support: handle `.mdx` files alongside `.md`
- [ ] README + setup guide + example Astro project

### Phase 4 — Auth upgrade (v0.4, optional)

- [ ] Better Auth adapter (optional config)
- [ ] GitHub OAuth login
- [ ] Multi-user support with role separation (editor vs. admin)

---

## 11. Installation & Setup (target README)

```bash
npm install astro-quill
```

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import studio from "astro-quill";

export default defineConfig({
  integrations: [
    studio({
      password: process.env.STUDIO_PASSWORD,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      github: {
        token: process.env.GITHUB_TOKEN,
        owner: "your-org",
        repo: "your-site",
        baseBranch: "main",
      },
    }),
  ],
});
```

```bash
# .env
STUDIO_PASSWORD=your-password
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

Then visit `yoursite.com/studio`.

---

## 12. Constraints & Non-Goals

**v1 does not include:**

- Multi-user accounts or roles
- Rich text / WYSIWYG editing (markdown only)
- Image uploads
- Creating or deleting files (edit existing files only)
- Support for non-Astro frameworks
- A hosted/SaaS version

**Requirements:**

- Site must be deployed on a host that supports Astro SSR: Vercel, Netlify, Cloudflare Workers, or self-hosted Node. Static hosts (GitHub Pages, plain S3) will not work as they have no runtime to serve the `/studio/api/*` routes.
- GitHub repo must have PR preview deployments configured (Vercel or Netlify)
- Node.js 18+

**Future: Edge function sidecar (Option C)**
For teams on static hosts, a future version could ship a standalone edge function (Cloudflare Worker or Netlify Edge Function) that handles only the `/studio/api/*` routes independently of the host. The Astro site stays fully static; the studio backend is deployed separately. This is earmarked for a future release.
