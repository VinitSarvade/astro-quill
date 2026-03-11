import type { APIRoute } from "astro";

import { checkPRStatus } from "../../../../server/github";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const prNumber = parseInt(params.pr ?? "", 10);

  if (isNaN(prNumber)) {
    return new Response(JSON.stringify({ error: "Invalid PR number" }), { status: 400 });
  }

  const result = await checkPRStatus(prNumber);

  return result.match(
    (data) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    (error) => {
      console.error("Preview status check error:", error);
      return new Response(JSON.stringify({ error: "Failed to check preview status" }), { status: 500 });
    },
  );
};
