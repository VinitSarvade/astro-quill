import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOctokit = {
  rest: {
    repos: {
      getBranch: vi.fn(),
      getContent: vi.fn(),
      createOrUpdateFileContents: vi.fn(),
      listDeployments: vi.fn(),
      listDeploymentStatuses: vi.fn(),
    },
    git: {
      createRef: vi.fn(),
      deleteRef: vi.fn(),
    },
    pulls: {
      create: vi.fn(),
      get: vi.fn(),
      merge: vi.fn(),
    },
  },
};

const virtualConfigPath = "/Users/vinit/Projects/astro-quill/src/__mocks__/virtual-config.ts";
const virtualServerPath = "/Users/vinit/Projects/astro-quill/src/__mocks__/virtual-server.ts";

// vitest v4 requires a real class/function for `new` calls
vi.mock("@octokit/rest", () => ({
  Octokit: class MockOctokit {
    constructor() {
      return mockOctokit;
    }
  },
}));

function resetMockFns() {
  for (const group of Object.values(mockOctokit.rest)) {
    for (const fn of Object.values(group)) {
      fn.mockReset();
    }
  }
}

function mockDefaultVirtualModules() {
  vi.doMock(virtualConfigPath, () => ({
    github: { owner: "test-owner", repo: "test-repo", baseBranch: "main" },
  }));
  vi.doMock(virtualServerPath, () => ({
    githubToken: "test-github-token",
  }));
}

beforeEach(() => {
  vi.resetModules();
  resetMockFns();
  mockDefaultVirtualModules();
});

async function importGithubModule() {
  return import("/Users/vinit/Projects/astro-quill/src/server/github");
}

describe("createPreviewPR", () => {
  it("returns ok with prNumber, prUrl, branch on success", async () => {
    const { createPreviewPR } = await importGithubModule();

    mockOctokit.rest.repos.getBranch.mockResolvedValue({
      data: { commit: { sha: "abc123" } },
    });
    mockOctokit.rest.git.createRef.mockResolvedValue({});
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: { sha: "file-sha-456" },
    });
    mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});
    mockOctokit.rest.pulls.create.mockResolvedValue({
      data: { number: 42, html_url: "https://github.com/test-owner/test-repo/pull/42" },
    });

    const result = await createPreviewPR("/fake/path/content.md", "new content");

    expect(result.isOk()).toBe(true);
    const value = result._unsafeUnwrap();
    expect(value.prNumber).toBe(42);
    expect(value.prUrl).toBe("https://github.com/test-owner/test-repo/pull/42");
    expect(value.branch).toMatch(/^studio\/edit-\d+$/);
  });

  it("returns error when github config is missing", async () => {
    vi.doMock(virtualConfigPath, () => ({
      github: undefined,
    }));

    const { createPreviewPR } = await importGithubModule();

    const result = await createPreviewPR("/fake/path/content.md", "new content");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe("GitHub owner or repo not configured");
  });

  it("creates a branch with the studio/edit- prefix", async () => {
    const { createPreviewPR } = await importGithubModule();

    mockOctokit.rest.repos.getBranch.mockResolvedValue({
      data: { commit: { sha: "abc123" } },
    });
    mockOctokit.rest.git.createRef.mockResolvedValue({});
    mockOctokit.rest.repos.getContent.mockRejectedValue(new Error("Not found"));
    mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({});
    mockOctokit.rest.pulls.create.mockResolvedValue({
      data: { number: 7, html_url: "https://github.com/test-owner/test-repo/pull/7" },
    });

    await createPreviewPR("/fake/path/file.md", "content");

    const refArg = mockOctokit.rest.git.createRef.mock.calls[0][0];
    expect(refArg.ref).toMatch(/^refs\/heads\/studio\/edit-\d+$/);
  });
});

describe("checkPRStatus", () => {
  it("returns previewUrl null when no deployments exist", async () => {
    const { checkPRStatus } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { sha: "sha-abc" } },
    });
    mockOctokit.rest.repos.listDeployments.mockResolvedValue({ data: [] });

    const result = await checkPRStatus(1);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().previewUrl).toBeNull();
  });

  it("returns previewUrl when a successful deployment status exists", async () => {
    const { checkPRStatus } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { sha: "sha-abc" } },
    });
    mockOctokit.rest.repos.listDeployments.mockResolvedValue({
      data: [{ id: 100 }],
    });
    mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValue({
      data: [{ state: "success", environment_url: "https://preview.example.com" }],
    });

    const result = await checkPRStatus(1);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().previewUrl).toBe("https://preview.example.com");
  });

  it("returns previewUrl null when deployments exist but none are successful", async () => {
    const { checkPRStatus } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { sha: "sha-abc" } },
    });
    mockOctokit.rest.repos.listDeployments.mockResolvedValue({
      data: [{ id: 200 }],
    });
    mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValue({
      data: [
        { state: "pending", environment_url: "https://pending.example.com" },
        { state: "failure", environment_url: null },
      ],
    });

    const result = await checkPRStatus(1);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().previewUrl).toBeNull();
  });
});

describe("mergeAndCleanup", () => {
  it("returns ok on successful merge of a studio/edit- branch", async () => {
    const { mergeAndCleanup } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { ref: "studio/edit-1234567890" } },
    });
    mockOctokit.rest.pulls.merge.mockResolvedValue({});
    mockOctokit.rest.git.deleteRef.mockResolvedValue({});

    const result = await mergeAndCleanup(10);

    expect(result.isOk()).toBe(true);
    expect(mockOctokit.rest.pulls.merge).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 10, merge_method: "squash" }),
    );
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "heads/studio/edit-1234567890" }),
    );
  });

  it("returns error when trying to merge a non-studio branch", async () => {
    const { mergeAndCleanup } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { ref: "feature/unrelated-branch" } },
    });

    const result = await mergeAndCleanup(20);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Can only merge PRs created by Astro Quill Studio",
    );
    expect(mockOctokit.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it("succeeds even if branch deletion fails", async () => {
    const { mergeAndCleanup } = await importGithubModule();

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: { head: { ref: "studio/edit-9999999999" } },
    });
    mockOctokit.rest.pulls.merge.mockResolvedValue({});
    mockOctokit.rest.git.deleteRef.mockRejectedValue(new Error("Reference does not exist"));

    const result = await mergeAndCleanup(30);

    expect(result.isOk()).toBe(true);
  });
});
