/** CorpusSource over a local directory. What the CLI and the Action use. */
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { CorpusSource } from "../core/types.js";

const SKIP = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".next", "vendor",
  "__pycache__", ".venv",
]);

const INDEX_NAMES = ["AGENTS.md", "CLAUDE.md", "index.md", "README.md", "readme.md"];

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(root, full, out);
    else if (entry.isSymbolicLink() && entry.name.toLowerCase().endsWith(".md")) {
      try {
        const target = await realpath(full);
        const targetFromRoot = relative(root, target);
        if (targetFromRoot !== ".." && !targetFromRoot.startsWith(`..${sep}`) &&
            !isAbsolute(targetFromRoot) && (await stat(target)).isFile()) {
          out.push(relative(root, full).split(sep).join("/"));
        }
      } catch {
        // Broken links are not documents. Exiting the corpus through a link is forbidden.
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
}

export function fileSystemSource(
  root: string,
  options: { surface?: string; include?: string[] } = {},
): CorpusSource {
  const absoluteRoot = resolve(root);
  let rootPromise: Promise<string> | undefined;
  const canonicalRoot = () => rootPromise ??= realpath(absoluteRoot);
  const safeExistingFile = async (id: string): Promise<string> => {
    const absolute = resolve(absoluteRoot, ...id.split("/"));
    const candidate = relative(absoluteRoot, absolute);
    if (!candidate || candidate === ".." || candidate.startsWith(`..${sep}`) || isAbsolute(candidate)) {
      throw new Error(`document path must be inside the corpus: ${id}`);
    }
    const [rootPath, target] = await Promise.all([canonicalRoot(), realpath(absolute)]);
    const targetFromRoot = relative(rootPath, target);
    if (targetFromRoot === ".." || targetFromRoot.startsWith(`..${sep}`) || isAbsolute(targetFromRoot)) {
      throw new Error(`document path resolves outside the corpus: ${id}`);
    }
    if (!(await stat(target)).isFile()) throw new Error(`document path is not a file: ${id}`);
    return target;
  };
  const includes = (options.include ?? []).map((value) => {
    const absolute = resolve(absoluteRoot, value);
    const candidate = relative(absoluteRoot, absolute);
    if (!candidate || candidate === ".." || candidate.startsWith(`..${sep}`) || isAbsolute(candidate)) {
      throw new Error(`included path must be inside the corpus: ${value}`);
    }
    return candidate.split(sep).join("/").replace(/\/$/, "");
  });
  let explicitSurface: string | undefined;
  if (options.surface) {
    const absoluteSurface = resolve(absoluteRoot, options.surface);
    const candidate = relative(absoluteRoot, absoluteSurface);
    if (!candidate || candidate.startsWith(`..${sep}`) || candidate === ".." || isAbsolute(candidate)) {
      throw new Error(`navigation surface must be a file inside the corpus: ${options.surface}`);
    }
    if (!candidate.toLowerCase().endsWith(".md")) {
      throw new Error(`navigation surface must be Markdown: ${options.surface}`);
    }
    explicitSurface = candidate.split(sep).join("/");
  }
  let listed: string[] | undefined;
  return {
    name: `fs:${root}`,
    async list() {
      if (!listed) {
        const out: string[] = [];
        const rootPath = await canonicalRoot();
        await walk(rootPath, rootPath, out);
        // The index is the navigation surface, not a document to be found.
        const index = await this.indexPath?.();
        listed = out.filter((id) => id !== index && (
          !includes.length || includes.some((include) => id === include || id.startsWith(`${include}/`))
        )).sort();
      }
      return listed;
    },
    async read(id) {
      return readFile(await safeExistingFile(id), "utf8");
    },
    async indexPath() {
      if (explicitSurface) {
        try {
          await safeExistingFile(explicitSurface);
          return explicitSurface;
        } catch {
          // Handled below with a stable, user-facing error.
        }
        throw new Error(`navigation surface is unavailable or outside the corpus: ${explicitSurface}`);
      }
      for (const name of INDEX_NAMES) {
        try {
          await safeExistingFile(name);
          return name;
        } catch {
          // absent, try the next candidate
        }
      }
      return undefined;
    },
  };
}
