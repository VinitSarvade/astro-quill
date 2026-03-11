import type { APIContext, MiddlewareNext } from "astro";
import { password } from "virtual:astro-quill/server";

import { verifySessionCookie } from "../server/auth";

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/studio/api/")) {
    if (context.request.method === "POST") {
      const contentType = context.request.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Invalid content type" }), { status: 415 });
      }
    }

    if (url.pathname !== "/studio/api/auth") {
      if (!password) {
        return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
      }

      const sessionCookie = context.cookies.get("astro-quill-session")?.value;
      if (!sessionCookie) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }

      const result = await verifySessionCookie(sessionCookie, password);
      const isValid = result.match(
        (value) => value,
        () => false,
      );

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 401,
        });
      }
    }
  }

  return next();
}
