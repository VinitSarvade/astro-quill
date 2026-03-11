import type { APIRoute } from "astro";
import { match, P } from "ts-pattern";

import { mergeAndCleanup } from "../../server/github";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const validationResponse = match(body)
      .with({ prNumber: P.number }, () => null)
      .otherwise(
        () =>
          new Response(
            JSON.stringify({ error: "Invalid payload: expected prNumber (number)" }),
            { status: 400 },
          ),
      );

    if (validationResponse) return validationResponse;

    const result = await mergeAndCleanup(body.prNumber);

    return result.match(
      () =>
        new Response(JSON.stringify({ success: true }), {
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
