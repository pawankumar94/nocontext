/** Turning a CorpusSource into documents and a navigation surface. */
import type { CorpusSource, Doc, NavigationSurface } from "../types.js";

export const POINTER_EXTRACTOR = "pointer-block@1";
export const FILE_TREE_EXTRACTOR = "file-tree@1";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Deliberately not a YAML parser. Scalars are all the contracts need. */
export function splitFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const m = FRONTMATTER.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, unknown> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv?.[1]) meta[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

function titleOf(meta: Record<string, unknown>, body: string, id: string): string {
  if (typeof meta["title"] === "string" && meta["title"]) return meta["title"];
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1?.[1]) return h1[1].trim();
  return id.replace(/\.md$/i, "").split("/").pop() ?? id;
}

function resolveReference(fromFile: string, reference: string): string | undefined {
  const parts = fromFile.split("/").slice(0, -1);
  for (const part of reference.replace(/^\.\//, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return undefined;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

function referencesInLine(indexId: string, line: string): Set<string> {
  const refs = new Set<string>();
  const pathPattern = /(?:\.\.\/|\.\/)*[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.md\b/gi;
  for (const match of line.matchAll(pathPattern)) {
    const raw = match[0];
    if (!raw) continue;
    const resolved = resolveReference(indexId, raw);
    if (resolved) refs.add(resolved);
  }
  return refs;
}

function pointerBlocks(indexId: string, body: string): { text: string; refs: Set<string> }[] {
  const lines = body.split(/\r?\n/);
  const blocks: { text: string; refs: Set<string> }[] = [];
  let inFence = false;
  let heading: string | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s+/.test(line)) {
      heading = line;
      continue;
    }
    const refs = referencesInLine(indexId, line);
    if (!refs.size) continue;
    const text = [heading, line].filter(Boolean).join("\n");
    blocks.push({ text, refs });
  }
  return blocks;
}

export async function loadDocs(source: CorpusSource): Promise<Doc[]> {
  const ids = await source.list();
  return Promise.all(ids.map(async (id) => {
    const { meta, body } = splitFrontmatter(await source.read(id));
    return { id, title: titleOf(meta, body, id), body, meta };
  }));
}

/**
 * Build the navigation surface: what the agent sees before opening anything.
 *
 * With an index, each document's entry is the line of the index that links to
 * it, which is how the index actually describes it. Without one, the surface is
 * the file tree, because that is genuinely all an agent has. Paths only, not
 * titles: reading frontmatter means opening the file, which is the thing the
 * surface is supposed to make unnecessary.
 */
export async function buildSurface(
  source: CorpusSource,
  docs: Doc[],
): Promise<NavigationSurface> {
  const indexId = await source.indexPath?.();
  if (!indexId) {
    return {
      kind: "implicit",
      extractor: FILE_TREE_EXTRACTOR,
      entries: docs.map((d) => ({ docId: d.id, text: d.id.replace(/[/_-]/g, " ") })),
    };
  }

  const { body } = splitFrontmatter(await source.read(indexId));
  const pointers = pointerBlocks(indexId, body);
  const entries = docs.map((doc) => {
    const hit = pointers.filter(({ refs }) => refs.has(doc.id)).map(({ text }) => text);
    return { docId: doc.id, text: hit.length ? hit.join(" ") : "" };
  });

  // An index that links to nothing is not a navigation surface. Fall back
  // rather than scoring every document as unreachable, which would be
  // dramatic and wrong.
  if (entries.every((e) => e.text === "")) {
    return {
      kind: "implicit",
      extractor: FILE_TREE_EXTRACTOR,
      entries: docs.map((d) => ({ docId: d.id, text: d.id.replace(/[/_-]/g, " ") })),
    };
  }
  return { kind: "explicit", source: indexId, extractor: POINTER_EXTRACTOR, entries };
}
