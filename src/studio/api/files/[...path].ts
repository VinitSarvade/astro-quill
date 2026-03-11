import { join, resolve } from "node:path";

import type { APIRoute } from "astro";

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

  try {
    const content = await getFileContent(requestedPath);

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
