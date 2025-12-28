import { promises as fs } from "node:fs";
import path from "node:path";

import { shouldIgnore } from "./ignore.js";

export type TreeNode =
  | { type: "file"; name: string; fullPath: string; size?: number }
  | { type: "dir"; name: string; fullPath: string; children: TreeNode[] };

export type BuildOptions = {
  maxDepth?: number; // default: Infinity
  includeHidden?: boolean; // default: false
  followSymlinks?: boolean; // default: false
  includeSizes?: boolean; // default: false (files only)
  ignore?: string[]; // glob patterns (relative to root), default: common ignores
  sort?: "name" | "dirs-first"; // default: dirs-first
};

const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/.cache/**",
];

function isHidden(name: string) {
  return name.startsWith(".");
}

export async function buildFolderTree(
  rootDir: string,
  options: BuildOptions = {}
): Promise<TreeNode> {
  const absRoot = path.resolve(rootDir);
  const stat = await fs.lstat(absRoot);

  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${absRoot}`);
  }

  const opts: Required<BuildOptions> = {
    maxDepth: options.maxDepth ?? Number.POSITIVE_INFINITY,
    includeHidden: options.includeHidden ?? false,
    followSymlinks: options.followSymlinks ?? false,
    includeSizes: options.includeSizes ?? false,
    ignore: options.ignore ?? DEFAULT_IGNORES,
    sort: options.sort ?? "dirs-first",
  };

  async function walk(currentPath: string, depth: number): Promise<TreeNode> {
    const name = path.basename(currentPath);
    const rel = path.relative(absRoot, currentPath) || ".";

    const lst = await fs.lstat(currentPath);

    // Symlink handling
    if (lst.isSymbolicLink() && !opts.followSymlinks) {
      // Represent symlink as file-ish node to avoid infinite loops
      return {
        type: "file",
        name: `${name} -> (symlink)`,
        fullPath: currentPath,
      };
    }

    const st = lst.isSymbolicLink() ? await fs.stat(currentPath) : lst;

    if (st.isDirectory()) {
      if (depth > opts.maxDepth) {
        return { type: "dir", name, fullPath: currentPath, children: [] };
      }

      let entries = await fs.readdir(currentPath, { withFileTypes: true });

      entries = entries.filter((e) => {
        if (!opts.includeHidden && isHidden(e.name)) return false;

        const entryFull = path.join(currentPath, e.name);
        const entryRel = path.relative(absRoot, entryFull);
        if (shouldIgnore(entryRel, opts.ignore)) return false;
        return true;
      });

      // Sort
      entries.sort((a, b) => {
        if (opts.sort === "dirs-first") {
          const aDir = a.isDirectory();
          const bDir = b.isDirectory();
          if (aDir !== bDir) return aDir ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const children: TreeNode[] = [];
      for (const e of entries) {
        const childPath = path.join(currentPath, e.name);
        children.push(await walk(childPath, depth + 1));
      }

      return {
        type: "dir",
        name: rel === "." ? path.basename(absRoot) : name,
        fullPath: currentPath,
        children,
      };
    }

    if (st.isFile()) {
      const node: TreeNode = { type: "file", name, fullPath: currentPath };
      if (opts.includeSizes) node.size = st.size;
      return node;
    }

    // Other types (fifo, socket, etc.)
    return { type: "file", name: `${name} (special)`, fullPath: currentPath };
  }

  const tree = await walk(absRoot, 0);
  return tree;
}
