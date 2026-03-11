import { join } from "node:path";

import type { APIRoute } from "astro";

import { getFiles } from "../../server/files";

export const prerender = false;

export const GET: APIRoute = async () => {
  const contentDir = join(process.cwd(), "src", "content");

  try {
    const files = await getFiles(contentDir, contentDir);

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response(JSON.stringify({ files: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
