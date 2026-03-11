import { SignJWT, jwtVerify } from "jose";
import { ResultAsync } from "neverthrow";

async function deriveSecret(password: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("astro-quill-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export async function createSessionCookie(password: string): Promise<string> {
  const secret = await deriveSecret(password);
  return new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export function verifySessionCookie(token: string, password: string): ResultAsync<boolean, Error> {
  return ResultAsync.fromPromise(
    deriveSecret(password).then(async (secret) => {
      await jwtVerify(token, secret);
      return true;
    }),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );
}
