import type { APIContext, MiddlewareNext } from "astro";
import { password } from "virtual:astro-quill/config";

import { verifySessionCookie } from "../server/auth";

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/studio/api/")) {
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
