import type { APIRoute } from "astro";
import { password } from "virtual:astro-quill/config";

import { createSessionCookie } from "../../server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!password) {
    return new Response(JSON.stringify({ error: "Studio password not configured" }), {
      status: 500,
    });
  }

  try {
    const body = await request.json();

    if (!body.password || typeof body.password !== "string") {
      return new Response(JSON.stringify({ error: "Password is required" }), { status: 400 });
    }

    if (body.password === password) {
      const token = await createSessionCookie(password);

      cookies.set("astro-quill-session", token, {
        path: "/studio",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
};
