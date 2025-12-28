#!/usr/bin/env node
import path from "node:path";

import { buildFolderTree } from "./tree.js";
import { formatTree } from "./format.js";

function getArg(name: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

async function main() {
  const target =
    process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : ".";

  const maxDepthRaw = getArg("--maxDepth");
  const ignoreRaw = getArg("--ignore");

  const sort =
    (getArg("--sort") as "name" | "dirs-first" | undefined) ?? "dirs-first";

  const tree = await buildFolderTree(path.resolve(target), {
    maxDepth: maxDepthRaw ? Number(maxDepthRaw) : undefined,
    includeHidden: hasFlag("--hidden"),
    followSymlinks: hasFlag("--followSymlinks"),
    includeSizes: hasFlag("--sizes"),
    ignore: ignoreRaw
      ? ignoreRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    sort,
  });

  const text = formatTree(tree, {
    showFullPath: hasFlag("--fullPath"),
    showSizes: hasFlag("--sizes"),
  });

  process.stdout.write(text + "\n");
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
