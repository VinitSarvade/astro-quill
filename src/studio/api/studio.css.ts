import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
    const cssPath = resolve(packageRoot, "dist/studio.css");

    if (!existsSync(cssPath)) {
      return new Response("Not Found", { status: 404 });
    }

    const cssContent = readFileSync(cssPath, "utf8");

    return new Response(cssContent, {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
};
