import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete("astro-quill-session", { path: "/studio" });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
