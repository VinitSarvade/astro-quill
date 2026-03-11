import { timingSafeEqual } from "node:crypto";

import type { APIRoute } from "astro";
import { match, P } from "ts-pattern";
import { password as configuredPassword } from "virtual:astro-quill/server";

import { createSessionCookie } from "../../server/auth";

function safeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return timingSafeEqual(bufA, bufB);
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!configuredPassword) {
    return new Response(JSON.stringify({ error: "Studio password not configured" }), {
      status: 500,
    });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Too many attempts, try again later" }), {
      status: 429,
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
          secure: new URL(request.url).protocol === "https:",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
      })
      .otherwise(() => new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 }));

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
};
