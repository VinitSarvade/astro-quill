import { describe, it, expect, beforeEach } from "vitest";

import { createSessionCookie, verifySessionCookie } from "../auth";

const testPassword = "super-secret-password";

describe("createSessionCookie", () => {
  it("returns a valid JWT string with three dot-separated parts", async () => {
    const token = await createSessionCookie(testPassword);

    expect(token).toBeTruthy();
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("produces different tokens on successive calls due to iat", async () => {
    const tokenA = await createSessionCookie(testPassword);
    // slight delay so iat differs
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const tokenB = await createSessionCookie(testPassword);

    expect(tokenA).not.toBe(tokenB);
  });
});

describe("verifySessionCookie", () => {
  let validToken: string;

  beforeEach(async () => {
    validToken = await createSessionCookie(testPassword);
  });

  it("returns ok(true) for a token verified with the same password", async () => {
    const result = await verifySessionCookie(validToken, testPassword);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it("returns an error for a tampered token", async () => {
    const tampered = validToken.slice(0, -4) + "XXXX";
    const result = await verifySessionCookie(tampered, testPassword);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error);
  });

  it("returns an error when verified with a different password", async () => {
    const result = await verifySessionCookie(validToken, "wrong-password");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error);
  });
});
