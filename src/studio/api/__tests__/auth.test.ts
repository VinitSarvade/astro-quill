import { describe, it, expect, vi, beforeEach } from "vitest";

const virtualServerPath = "../../../__mocks__/virtual-server";

function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/studio/api/auth", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createMockCookies() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((name: string) => {
      const val = store.get(name);
      return val ? { value: val } : undefined;
    }),
    set: vi.fn((name: string, value: string) => store.set(name, value)),
    delete: vi.fn((name: string) => store.delete(name)),
  };
}

describe("POST /studio/api/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns 500 when password is not configured", async () => {
    vi.doMock(virtualServerPath, () => ({
      password: undefined,
      aiApiKey: "test-api-key",
      githubToken: "test-github-token",
    }));

    vi.doMock("../../../server/auth", () => ({
      createSessionCookie: vi.fn(),
    }));

    const { POST } = await import("../auth");

    const request = createMockRequest("POST", { password: "anything" });
    const cookies = createMockCookies();

    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("returns 429 after too many failed attempts from same IP", async () => {
    vi.doMock(virtualServerPath, () => ({
      password: "correct-password",
      aiApiKey: "test-api-key",
      githubToken: "test-github-token",
    }));

    vi.doMock("../../../server/auth", () => ({
      createSessionCookie: vi.fn().mockResolvedValue("mock-jwt-token"),
    }));

    const { POST } = await import("../auth");

    const testIp = "192.168.1.100";

    for (let i = 0; i < 5; i++) {
      const request = createMockRequest("POST", { password: "wrong" }, {
        "x-forwarded-for": testIp,
      });
      const cookies = createMockCookies();
      await POST({ request, cookies } as any);
    }

    const request = createMockRequest("POST", { password: "wrong" }, {
      "x-forwarded-for": testIp,
    });
    const cookies = createMockCookies();
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toMatch(/too many/i);
  });

  it("returns 200 and sets cookie on correct password", async () => {
    vi.doMock(virtualServerPath, () => ({
      password: "correct-password",
      aiApiKey: "test-api-key",
      githubToken: "test-github-token",
    }));

    vi.doMock("../../../server/auth", () => ({
      createSessionCookie: vi.fn().mockResolvedValue("mock-jwt-token"),
    }));

    const { POST } = await import("../auth");

    const request = createMockRequest("POST", { password: "correct-password" }, {
      "x-forwarded-for": "10.0.0.1",
    });
    const cookies = createMockCookies();

    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(cookies.set).toHaveBeenCalledWith(
      "astro-quill-session",
      "mock-jwt-token",
      expect.objectContaining({ path: "/studio", httpOnly: true }),
    );
  });

  it("returns 401 on wrong password", async () => {
    vi.doMock(virtualServerPath, () => ({
      password: "correct-password",
      aiApiKey: "test-api-key",
      githubToken: "test-github-token",
    }));

    vi.doMock("../../../server/auth", () => ({
      createSessionCookie: vi.fn(),
    }));

    const { POST } = await import("../auth");

    const request = createMockRequest("POST", { password: "wrong-password" }, {
      "x-forwarded-for": "10.0.0.2",
    });
    const cookies = createMockCookies();

    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toMatch(/invalid password/i);
  });

  it("returns 400 on malformed request body", async () => {
    vi.doMock(virtualServerPath, () => ({
      password: "correct-password",
      aiApiKey: "test-api-key",
      githubToken: "test-github-token",
    }));

    vi.doMock("../../../server/auth", () => ({
      createSessionCookie: vi.fn(),
    }));

    const { POST } = await import("../auth");

    const request = new Request("http://localhost/studio/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json{{{",
    });
    const cookies = createMockCookies();

    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/bad request/i);
  });
});
