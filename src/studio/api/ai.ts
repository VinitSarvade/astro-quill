import type { APIRoute } from "astro";

import { editMarkdown } from "../../server/ai";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.markdownContent || typeof body.markdownContent !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected markdownContent and instruction" }),
        { status: 400 },
      );
    }

    if (!body.instruction || typeof body.instruction !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected markdownContent and instruction" }),
        { status: 400 },
      );
    }

    const result = await editMarkdown(body.markdownContent, body.instruction);

    return result.match(
      (content) =>
        new Response(JSON.stringify({ content }), {
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
