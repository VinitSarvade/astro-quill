import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { getFiles, getFileContent } from "../files";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(tmpdir(), "astro-quill-test-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("getFiles", () => {
  it("returns empty array for an empty directory", async () => {
    const result = await getFiles(tempDir, tempDir);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("returns .md and .mdx files but ignores .txt and .js files", async () => {
    await Promise.all([
      fs.writeFile(join(tempDir, "post.md"), "# Post"),
      fs.writeFile(join(tempDir, "page.mdx"), "# Page"),
      fs.writeFile(join(tempDir, "notes.txt"), "notes"),
      fs.writeFile(join(tempDir, "script.js"), "console.log()"),
    ]);

    const result = await getFiles(tempDir, tempDir);
    const files = result._unsafeUnwrap();

    const names = files.map((f) => f.name);
    expect(names).toContain("post.md");
    expect(names).toContain("page.mdx");
    expect(names).not.toContain("notes.txt");
    expect(names).not.toContain("script.js");
  });

  it("returns nested directory structure with children", async () => {
    const subDir = join(tempDir, "blog");
    await fs.mkdir(subDir);
    await fs.writeFile(join(subDir, "entry.md"), "# Entry");

    const result = await getFiles(tempDir, tempDir);
    const nodes = result._unsafeUnwrap();

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("directory");
    expect(nodes[0].name).toBe("blog");
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children![0].name).toBe("entry.md");
  });

  it("skips hidden files and directories", async () => {
    const hiddenDir = join(tempDir, ".hidden");
    await fs.mkdir(hiddenDir);
    await fs.writeFile(join(hiddenDir, "secret.md"), "# Secret");
    await fs.writeFile(join(tempDir, ".dotfile.md"), "# Dot");
    await fs.writeFile(join(tempDir, "visible.md"), "# Visible");

    const result = await getFiles(tempDir, tempDir);
    const names = result._unsafeUnwrap().map((f) => f.name);

    expect(names).toEqual(["visible.md"]);
  });

  it("sorts directories before files, then alphabetically", async () => {
    await fs.mkdir(join(tempDir, "zebra"));
    await fs.writeFile(join(tempDir, "zebra", "z.md"), "z");
    await fs.mkdir(join(tempDir, "alpha"));
    await fs.writeFile(join(tempDir, "alpha", "a.md"), "a");
    await fs.writeFile(join(tempDir, "beta.md"), "b");
    await fs.writeFile(join(tempDir, "aardvark.md"), "a");

    const result = await getFiles(tempDir, tempDir);
    const names = result._unsafeUnwrap().map((f) => f.name);

    expect(names).toEqual(["alpha", "zebra", "aardvark.md", "beta.md"]);
  });

  it("returns error with code ENOENT for non-existent directory", async () => {
    const result = await getFiles(join(tempDir, "nonexistent"), tempDir);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(Error);
    expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
  });
});

describe("getFileContent", () => {
  it("returns file contents as a string", async () => {
    const filePath = join(tempDir, "readme.md");
    await fs.writeFile(filePath, "Hello, world!");

    const result = await getFileContent(filePath);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("Hello, world!");
  });

  it("returns error for non-existent file", async () => {
    const result = await getFileContent(join(tempDir, "missing.md"));

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(Error);
    expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
  });
});
