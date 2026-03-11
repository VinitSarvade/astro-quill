import { join, resolve } from "node:path";

import type { APIRoute } from "astro";
import { match } from "ts-pattern";

import { getFileContent } from "../../../server/files";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const pathParam = params.path;
  if (!pathParam) {
    return new Response(JSON.stringify({ error: "Path parameter is required" }), { status: 400 });
  }

  const contentDir = join(process.cwd(), "src", "content");
  const requestedPath = resolve(contentDir, pathParam);

  if (!requestedPath.startsWith(resolve(contentDir))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const result = await getFileContent(requestedPath);

  return result.match(
    (content) =>
      new Response(JSON.stringify({ content }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    (error) =>
      match(error.code)
        .with("ENOENT", () =>
          new Response(JSON.stringify({ error: "File not found" }), { status: 404 }),
        )
        .otherwise(() =>
          new Response(JSON.stringify({ error: error.message }), { status: 500 }),
        ),
  );
};
