import { timingSafeEqual } from "node:crypto";

import type { APIRoute } from "astro";
import { match, P } from "ts-pattern";
import { password as configuredPassword } from "virtual:astro-quill/config";

import { createSessionCookie } from "../../server/auth";

function safeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return timingSafeEqual(bufA, bufB);
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!configuredPassword) {
    return new Response(JSON.stringify({ error: "Studio password not configured" }), {
      status: 500,
    });
  }

  try {
    const body = await request.json();

    const response = await match(body)
      .with({ password: P.when((p) => safeCompare(p, configuredPassword)) }, async () => {
        const token = await createSessionCookie(configuredPassword);

        cookies.set("astro-quill-session", token, {
          path: "/studio",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
      })
      .otherwise(() => new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 }));

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
};
