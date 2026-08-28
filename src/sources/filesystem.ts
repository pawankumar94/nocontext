/** CorpusSource over a local directory. What the CLI and the Action use. */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { CorpusSource } from "../core/types.js";

const SKIP = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".next", "vendor",
  "__pycache__", ".venv",
]);

const INDEX_NAMES = ["index.md", "README.md", "readme.md"];

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(root, full, out);
    else if (entry.name.toLowerCase().endsWith(".md")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
}

export function fileSystemSource(root: string): CorpusSource {
  let listed: string[] | undefined;
  return {
    name: `fs:${root}`,
    async list() {
      if (!listed) {
        const out: string[] = [];
        await walk(root, root, out);
        // The index is the navigation surface, not a document to be found.
        const index = await this.indexPath?.();
        listed = out.filter((id) => id !== index).sort();
      }
      return listed;
    },
    async read(id) {
      return readFile(join(root, ...id.split("/")), "utf8");
    },
    async indexPath() {
      for (const name of INDEX_NAMES) {
        try {
          if ((await stat(join(root, name))).isFile()) return name;
        } catch {
          // absent, try the next candidate
        }
      }
      return undefined;
    },
  };
}
