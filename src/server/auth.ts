import { SignJWT, jwtVerify } from "jose";

let cachedSecret: Uint8Array | null = null;

async function getSecret(password: string): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "astro-quill-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  cachedSecret = new Uint8Array(hashBuffer);
  return cachedSecret;
}

export async function createSessionCookie(password: string): Promise<string> {
  const secret = await getSecret(password);
  return new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionCookie(token: string, password: string): Promise<boolean> {
  try {
    const secret = await getSecret(password);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
