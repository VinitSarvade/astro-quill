import { relative, join } from "node:path";

import { Octokit } from "@octokit/rest";
import { github } from "virtual:astro-quill/config";

let octokitInstance: Octokit | null = null;

function getOctokit(): Octokit {
  if (!github?.token) throw new Error("GitHub token not configured");
  if (!github?.owner || !github?.repo) throw new Error("GitHub owner or repo not configured");

  if (!octokitInstance) {
    octokitInstance = new Octokit({ auth: github.token });
  }

  return octokitInstance;
}

interface PreviewPRResult {
  prNumber: number;
  prUrl: string;
  branch: string;
}

export async function createPreviewPR(
  absoluteFilePath: string,
  newContent: string,
): Promise<PreviewPRResult> {
  const octokit = getOctokit();
  const owner = github!.owner!;
  const repo = github!.repo!;
  const baseBranch = github!.baseBranch || "main";

  const branchData = await octokit.rest.repos.getBranch({ owner, repo, branch: baseBranch });
  const baseSha = branchData.data.commit.sha;

  const timestamp = Math.floor(Date.now() / 1000);
  const newBranchName = `studio/edit-${timestamp}`;
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranchName}`,
    sha: baseSha,
  });

  const repoRelativePath = relative(process.cwd(), absoluteFilePath);
  const contentDir = join(process.cwd(), "src", "content");
  const contentRelativePath = relative(contentDir, absoluteFilePath);

  let fileSha: string | undefined;
  try {
    const fileData = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: repoRelativePath,
      ref: newBranchName,
    });
    // sha is needed to update an existing file; without it the API creates a new one
    if (!Array.isArray(fileData.data)) fileSha = fileData.data.sha;
  } catch {
    // File doesn't exist yet in the repo — that's fine, we'll create it
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: repoRelativePath,
    message: `Content edit via Astro Quill: ${contentRelativePath}`,
    content: Buffer.from(newContent).toString("base64"),
    branch: newBranchName,
    sha: fileSha,
  });

  const pr = await octokit.rest.pulls.create({
    owner,
    repo,
    title: `Studio Edit: ${contentRelativePath}`,
    head: newBranchName,
    base: baseBranch,
    body: `This is an automated content update via Astro Quill Studio.\n\nModified file: \`${contentRelativePath}\``,
  });

  return { prNumber: pr.data.number, prUrl: pr.data.html_url, branch: newBranchName };
}

interface PRStatusResult {
  previewUrl: string | null;
}

export async function checkPRStatus(prNumber: number): Promise<PRStatusResult> {
  const octokit = getOctokit();
  const owner = github!.owner!;
  const repo = github!.repo!;

  const pr = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });

  const deployments = await octokit.rest.repos.listDeployments({
    owner,
    repo,
    ref: pr.data.head.sha,
  });

  if (deployments.data.length > 0) {
    const statuses = await octokit.rest.repos.listDeploymentStatuses({
      owner,
      repo,
      deployment_id: deployments.data[0].id,
    });

    const successfulStatus = statuses.data.find(
      (s) => s.state === "success" && s.environment_url,
    );
    if (successfulStatus?.environment_url) {
      return { previewUrl: successfulStatus.environment_url };
    }
  }

  return { previewUrl: null };
}

export async function mergeAndCleanup(prNumber: number): Promise<void> {
  const octokit = getOctokit();
  const owner = github!.owner!;
  const repo = github!.repo!;

  const pr = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
  const headBranch = pr.data.head.ref;

  await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: "squash",
  });

  try {
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${headBranch}`,
    });
  } catch {
    // Branch cleanup is best-effort; failure here is non-critical
  }
}
