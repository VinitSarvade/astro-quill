import { describe, it, expect, vi, beforeEach } from "vitest";
import { okAsync, errAsync } from "neverthrow";

const mockGetFiles = vi.fn();
const mockGetFileContent = vi.fn();

vi.mock("../../../server/files", () => ({
  getFiles: (...args: unknown[]) => mockGetFiles(...args),
  getFileContent: (...args: unknown[]) => mockGetFileContent(...args),
}));

import { GET as getFilesList } from "../files";
import { GET as getFileContent } from "../files/[...path]";

function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost/studio/api/files", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /studio/api/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with files array on success", async () => {
    const mockFiles = [
      { name: "post.md", path: "post.md", type: "file" },
    ];
    mockGetFiles.mockReturnValue(okAsync(mockFiles));

    const request = createMockRequest("GET");
    const response = await getFilesList({ request } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.files).toEqual(mockFiles);
  });

  it("returns 200 with empty files array on ENOENT", async () => {
    const enoentError = Object.assign(new Error("No such file"), { code: "ENOENT" });
    mockGetFiles.mockReturnValue(errAsync(enoentError));

    const request = createMockRequest("GET");
    const response = await getFilesList({ request } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.files).toEqual([]);
  });

  it("returns 500 on other errors", async () => {
    const otherError = Object.assign(new Error("Permission denied"), { code: "EACCES" });
    mockGetFiles.mockReturnValue(errAsync(otherError));

    const request = createMockRequest("GET");
    const response = await getFilesList({ request } as any);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toMatch(/failed to read/i);
  });
});

describe("GET /studio/api/files/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with content on success", async () => {
    const fileContent = "# Hello World\n\nSome markdown content.";
    mockGetFileContent.mockReturnValue(okAsync(fileContent));

    const request = createMockRequest("GET");
    const response = await getFileContent({
      request,
      params: { path: "blog/post.md" },
    } as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.content).toBe(fileContent);
  });

  it("returns 403 on path traversal attempt", async () => {
    const request = createMockRequest("GET");
    const response = await getFileContent({
      request,
      params: { path: "../../etc/passwd" },
    } as any);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 400 when path param is missing", async () => {
    const request = createMockRequest("GET");
    const response = await getFileContent({
      request,
      params: {},
    } as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/path.*required/i);
  });

  it("returns 404 when file not found (ENOENT)", async () => {
    const enoentError = Object.assign(new Error("File not found"), { code: "ENOENT" });
    mockGetFileContent.mockReturnValue(errAsync(enoentError));

    const request = createMockRequest("GET");
    const response = await getFileContent({
      request,
      params: { path: "nonexistent.md" },
    } as any);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toMatch(/not found/i);
  });
});
