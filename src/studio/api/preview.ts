import { join } from "node:path";

import type { APIRoute } from "astro";
import { match, P } from "ts-pattern";

import { createPreviewPR } from "../../server/github";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const validationResponse = match(body)
      .with({ filePath: P.string, markdownContent: P.string }, () => null)
      .otherwise(
        () =>
          new Response(
            JSON.stringify({ error: "Invalid payload: expected filePath and markdownContent" }),
            { status: 400 },
          ),
      );

    if (validationResponse) return validationResponse;

    const contentDir = join(process.cwd(), "src", "content");
    const absolutePath = join(contentDir, body.filePath);

    const result = await createPreviewPR(absolutePath, body.markdownContent);

    return result.match(
      (data) =>
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      (error) => new Response(JSON.stringify({ error: error.message }), { status: 500 }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
