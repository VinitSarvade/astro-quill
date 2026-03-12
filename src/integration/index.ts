import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

import {
  virtualModuleName,
  resolvedVirtualModuleId,
  virtualServerModuleName,
  resolvedVirtualServerModuleId,
  virtualModuleDts,
} from "../virtual/config";
import type { AstroQuillOptions } from "./types";

export default function astroQuill(options?: AstroQuillOptions): AstroIntegration {
  return {
    name: "astro-quill",
    hooks: {
      "astro:config:setup": ({ config, injectRoute, addMiddleware, updateConfig, logger }) => {
        if (!config.adapter) {
          logger.warn(
            "Astro Quill injects SSR API routes. You must install a server adapter (e.g. @astrojs/node) to build for production.",
          );
        }

        const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../");

        injectRoute({
          pattern: "/studio",
          entrypoint: resolve(packageRoot, "src/studio/pages/index.astro"),
        });

        // Served as a dynamic endpoint because injectRoute doesn't support static asset passthrough
        injectRoute({
          pattern: "/studio/studio.css",
          entrypoint: resolve(packageRoot, "src/studio/api/studio.css.ts"),
        });

        injectRoute({
          pattern: "/studio/api/auth",
          entrypoint: resolve(packageRoot, "src/studio/api/auth.ts"),
        });
        injectRoute({
          pattern: "/studio/api/logout",
          entrypoint: resolve(packageRoot, "src/studio/api/logout.ts"),
        });
        injectRoute({
          pattern: "/studio/api/files",
          entrypoint: resolve(packageRoot, "src/studio/api/files.ts"),
        });
        injectRoute({
          pattern: "/studio/api/files/[...path]",
          entrypoint: resolve(packageRoot, "src/studio/api/files/[...path].ts"),
        });
        injectRoute({
          pattern: "/studio/api/ai",
          entrypoint: resolve(packageRoot, "src/studio/api/ai.ts"),
        });
        injectRoute({
          pattern: "/studio/api/preview",
          entrypoint: resolve(packageRoot, "src/studio/api/preview.ts"),
        });
        injectRoute({
          pattern: "/studio/api/preview/[pr]/status",
          entrypoint: resolve(packageRoot, "src/studio/api/preview/[pr]/status.ts"),
        });
        injectRoute({
          pattern: "/studio/api/publish",
          entrypoint: resolve(packageRoot, "src/studio/api/publish.ts"),
        });

        addMiddleware({
          entrypoint: resolve(packageRoot, "src/studio/middleware.ts"),
          order: "pre",
        });

        updateConfig({
          vite: {
            server: {
              fs: {
                allow: [packageRoot],
              },
            },
            plugins: [
              {
                name: "vite-plugin-astro-quill",
                resolveId(id) {
                  if (id === virtualModuleName) return resolvedVirtualModuleId;
                  if (id === virtualServerModuleName) return resolvedVirtualServerModuleId;
                },
                load(id, loadOptions) {
                  if (id === resolvedVirtualModuleId) {
                    const { apiKey: _aiKey, ...publicAi } = options?.ai ?? {};
                    const { token: _ghToken, ...publicGithub } = options?.github ?? {};
                    return `
                      export const ai = ${JSON.stringify(publicAi)};
                      export const github = ${JSON.stringify(publicGithub)};
                    `;
                  }
                  if (id === resolvedVirtualServerModuleId) {
                    if (!loadOptions?.ssr) {
                      throw new Error("virtual:astro-quill/server can only be imported in server code");
                    }
                    return `
                      export const password = ${JSON.stringify(options?.password)};
                      export const aiApiKey = ${JSON.stringify(options?.ai?.apiKey)};
                      export const githubToken = ${JSON.stringify(options?.github?.token)};
                    `;
                  }
                },
              },
            ],
          },
        });
      },
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "astro-quill-config.d.ts",
          content: virtualModuleDts,
        });
      },
    },
  };
}
