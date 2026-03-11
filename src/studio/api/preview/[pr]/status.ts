import type { APIRoute } from "astro";

import { checkPRStatus } from "../../../../server/github";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const prNumber = parseInt(params.pr ?? "", 10);

  if (isNaN(prNumber)) {
    return new Response(JSON.stringify({ error: "Invalid PR number" }), { status: 400 });
  }

  try {
    const result = await checkPRStatus(prNumber);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
