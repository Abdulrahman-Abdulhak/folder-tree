import type { TreeNode } from "./tree.js";

export type FormatOptions = {
  showFullPath?: boolean; // default: false
  showSizes?: boolean; // default: false
  indent?: string; // default: "  "
};

function formatSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  const rounded = i === 0 ? `${Math.round(size)}` : `${size.toFixed(1)}`;
  return `${rounded} ${units[i]}`;
}

export function formatTree(node: TreeNode, options: FormatOptions = {}) {
  const opts: Required<FormatOptions> = {
    showFullPath: options.showFullPath ?? false,
    showSizes: options.showSizes ?? false,
    indent: options.indent ?? "    ",
  };

  const lines: string[] = [];

  function label(n: TreeNode) {
    const base = opts.showFullPath ? n.fullPath : n.name;
    if (opts.showSizes && n.type === "file" && typeof n.size === "number") {
      return `${base} (${formatSize(n.size)})`;
    }
    return base;
  }

  function draw(n: TreeNode, prefix: string, isLast: boolean) {
    const branch = isLast ? "└── " : "├── ";
    lines.push(prefix + branch + label(n));

    if (n.type === "dir") {
      const nextPrefix = isLast
        ? opts.indent
        : "│" + opts.indent.slice(0, opts.indent.length - 1);

      n.children.forEach((c, idx) => {
        const last = idx === n.children.length - 1;
        draw(c, prefix + nextPrefix, last);
      });

      //   // Special handling for root: use tree style after first line
      //   if (prefix === "") {
      //     n.children.forEach((c, idx) => {
      //       const last = idx === n.children.length - 1;
      //       draw(c, nextPrefix, last);
      //     });
      //     // remove duplicated root-children rendering
      //     lines.splice(1, n.children.length);
      //   }
    }
  }

  // Root rendering
  lines.push(label(node));
  if (node.type === "dir") {
    node.children.forEach((c, idx) => {
      const isLast = idx === node.children.length - 1;
      draw(c, "", isLast);
    });
  }

  return lines.join("\n");
}
