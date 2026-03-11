import { promises as fs } from "node:fs";
import { join, relative, extname } from "node:path";

import type { FileNode } from "../shared/types";

async function getFilesRecursive(dirPath: string, basePath: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = join(dirPath, entry.name);
    const relPath = relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await getFilesRecursive(fullPath, basePath);
      if (children.length > 0) {
        result.push({ name: entry.name, path: relPath, type: "directory", children });
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (ext === ".md" || ext === ".mdx") {
        result.push({ name: entry.name, path: relPath, type: "file" });
      }
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getFiles(dirPath: string, basePath: string): Promise<FileNode[]> {
  return getFilesRecursive(dirPath, basePath);
}

export async function getFileContent(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}
