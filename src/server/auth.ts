import { SignJWT, jwtVerify } from "jose";
import { ResultAsync } from "neverthrow";

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

export function verifySessionCookie(token: string, password: string): ResultAsync<boolean, Error> {
  return ResultAsync.fromPromise(
    getSecret(password).then(async (secret) => {
      await jwtVerify(token, secret);
      return true;
    }),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );
}
