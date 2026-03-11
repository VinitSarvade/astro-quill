import { join } from "node:path";

import type { APIRoute } from "astro";

import { getFiles } from "../../server/files";

export const prerender = false;

export const GET: APIRoute = async () => {
  const contentDir = join(process.cwd(), "src", "content");

  const result = await getFiles(contentDir, contentDir);

  return result.match(
    (files) =>
      new Response(JSON.stringify({ files }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    (error) =>
      error.code === "ENOENT"
        ? new Response(JSON.stringify({ files: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(JSON.stringify({ error: error.message }), { status: 500 }),
  );
};
