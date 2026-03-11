import type { APIRoute } from "astro";

import { mergeAndCleanup } from "../../server/github";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.prNumber || typeof body.prNumber !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid payload: expected prNumber (number)" }),
        { status: 400 },
      );
    }

    await mergeAndCleanup(body.prNumber);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
