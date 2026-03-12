import { describe, it, expect, vi, beforeEach } from "vitest";
import { okAsync, errAsync } from "neverthrow";

const mockCreatePreviewPR = vi.fn();

vi.mock("../../../server/github", () => ({
  createPreviewPR: (...args: unknown[]) => mockCreatePreviewPR(...args),
}));

import { POST } from "../preview";

function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/studio/api/preview", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /studio/api/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid payload (missing fields)", async () => {
    const request = createMockRequest("POST", { filePath: "blog/post.md" });
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/invalid payload/i);
  });

  it("returns 403 on path traversal in filePath", async () => {
    const request = createMockRequest("POST", {
      filePath: "../../etc/passwd",
      markdownContent: "malicious content",
    });
    const response = await POST({ request } as any);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 200 with PR data on success", async () => {
    const prData = {
      prNumber: 42,
      prUrl: "https://github.com/owner/repo/pull/42",
      branch: "studio/edit-1234567890",
    };
    mockCreatePreviewPR.mockReturnValue(okAsync(prData));

    const request = createMockRequest("POST", {
      filePath: "blog/post.md",
      markdownContent: "# Updated content",
    });
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.prNumber).toBe(42);
    expect(json.prUrl).toBe("https://github.com/owner/repo/pull/42");
    expect(json.branch).toBe("studio/edit-1234567890");
  });

  it("returns 500 on github error", async () => {
    mockCreatePreviewPR.mockReturnValue(errAsync(new Error("GitHub API rate limit")));

    const request = createMockRequest("POST", {
      filePath: "blog/post.md",
      markdownContent: "# Some content",
    });
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toMatch(/failed to create preview/i);
  });
});
