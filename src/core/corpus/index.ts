/** Turning a CorpusSource into documents and a navigation surface. */
import type { CorpusSource, Doc, NavigationSurface } from "../types.js";

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
      entries: docs.map((d) => ({ docId: d.id, text: d.id.replace(/[/_-]/g, " ") })),
    };
  }

  const { body } = splitFrontmatter(await source.read(indexId));
  const lines = body.split(/\r?\n/);
  let inFence = false;
  const references = lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return { line, refs: new Set<string>() };
    }
    return { line, refs: inFence ? new Set<string>() : referencesInLine(indexId, line) };
  });
  const entries = docs.map((doc) => {
    const hit = references.filter(({ refs }) => refs.has(doc.id)).map(({ line }) => line);
    return { docId: doc.id, text: hit.length ? hit.join(" ") : "" };
  });

  // An index that links to nothing is not a navigation surface. Fall back
  // rather than scoring every document as unreachable, which would be
  // dramatic and wrong.
  if (entries.every((e) => e.text === "")) {
    return {
      kind: "implicit",
      entries: docs.map((d) => ({ docId: d.id, text: d.id.replace(/[/_-]/g, " ") })),
    };
  }
  return { kind: "explicit", source: indexId, entries };
}
