import { minimatch } from "minimatch";

export function shouldIgnore(relativePath: string, patterns: string[]) {
  // Normalize to forward slashes for globs
  const p = relativePath.split("\\").join("/");
  return patterns.some((pat) =>
    minimatch(p, pat, { dot: true, nocase: false })
  );
}
