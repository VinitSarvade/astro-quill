import type { APIRoute } from "astro";
import { match, P } from "ts-pattern";

import { editMarkdown } from "../../server/ai";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const validationResponse = match(body)
      .with({ markdownContent: P.string, instruction: P.string }, () => null)
      .otherwise(
        () =>
          new Response(
            JSON.stringify({ error: "Invalid payload: expected markdownContent and instruction" }),
            { status: 400 },
          ),
      );

    if (validationResponse) return validationResponse;

    if (body.markdownContent.length > 100_000) {
      return new Response(JSON.stringify({ error: "Markdown content too large" }), { status: 400 });
    }
    if (body.instruction.length > 5_000) {
      return new Response(JSON.stringify({ error: "Instruction too long" }), { status: 400 });
    }

    const result = await editMarkdown(body.markdownContent, body.instruction);

    return result.match(
      (content) =>
        new Response(JSON.stringify({ content }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      (error) => {
        console.error("AI editing error:", error);
        return new Response(JSON.stringify({ error: "AI editing failed" }), { status: 500 });
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
