import { describe, it, expect, vi, beforeEach } from "vitest";
import { okAsync, errAsync } from "neverthrow";

const mockMergeAndCleanup = vi.fn();

vi.mock("../../../server/github", () => ({
  mergeAndCleanup: (...args: unknown[]) => mockMergeAndCleanup(...args),
}));

import { POST } from "../publish";

function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/studio/api/publish", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /studio/api/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid payload", async () => {
    const request = createMockRequest("POST", { wrongField: "value" });
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/invalid payload/i);
  });

  it("returns 200 on successful merge", async () => {
    mockMergeAndCleanup.mockReturnValue(okAsync(undefined));

    const request = createMockRequest("POST", { prNumber: 42 });
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockMergeAndCleanup).toHaveBeenCalledWith(42);
  });

  it("returns 500 on github error", async () => {
    mockMergeAndCleanup.mockReturnValue(errAsync(new Error("Merge conflict")));

    const request = createMockRequest("POST", { prNumber: 42 });
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toMatch(/failed to publish/i);
  });
});
