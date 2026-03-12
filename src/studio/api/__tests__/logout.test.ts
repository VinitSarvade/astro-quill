import { describe, it, expect, vi } from "vitest";

import { POST } from "../logout";

function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/studio/api/logout", {
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

describe("POST /studio/api/logout", () => {
  it("returns 200 and deletes cookie", async () => {
    const request = createMockRequest("POST");
    const cookies = createMockCookies();

    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(cookies.delete).toHaveBeenCalledWith("astro-quill-session", { path: "/studio" });
  });
});
