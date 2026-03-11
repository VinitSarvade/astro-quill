import { join } from "node:path";

import type { APIRoute } from "astro";

import { createPreviewPR } from "../../server/github";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.filePath || typeof body.filePath !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected filePath and markdownContent" }),
        { status: 400 },
      );
    }

    if (!body.markdownContent || typeof body.markdownContent !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected filePath and markdownContent" }),
        { status: 400 },
      );
    }

    const contentDir = join(process.cwd(), "src", "content");
    const absolutePath = join(contentDir, body.filePath);

    const result = await createPreviewPR(absolutePath, body.markdownContent);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
