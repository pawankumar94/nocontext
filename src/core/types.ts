/**
 * Core contracts. These deliberately make the commitments in docs/METHOD.md
 * unrepresentable to violate, rather than relying on discipline to honour them.
 */

/** One document in the corpus. */
export interface Doc {
  /** Stable identifier. Path relative to the corpus root. */
  id: string;
  /** Frontmatter title if present, else the filename. */
  title: string;
  /** Body with frontmatter stripped. */
  body: string;
  /** Parsed frontmatter, empty for plain Markdown. */
  meta: Record<string, unknown>;
}

/**
 * What the agent sees before it opens anything.
 *
 * `explicit` is a real index file. `implicit` is the file tree, used when the
 * corpus has no index. The two are not comparable and output must say which
 * was used. See METHOD.md, "Corpora with no index".
 */
export interface NavigationSurface {
  kind: "explicit" | "implicit";
  /** Source path for an explicit index, undefined for implicit. */
  source?: string;
  /** One entry per document, in the words the surface uses for it. */
  entries: { docId: string; text: string }[];
}

/**
 * A probe question.
 *
 * `origin` is load-bearing. Generated and supplied probes are reported
 * separately and never blended, because a supplied set from real query logs
 * is evidence and a generated set is an approximation.
 */
export interface Probe {
  question: string;
  /** The document that actually answers it. */
  expect: string;
  origin: "supplied" | "generated" | "fixture";
}

/** Anything that picks a document given a query. */
export interface Retriever {
  readonly name: string;
  /** Stable across releases so published results stay comparable. */
  readonly version: string;
  /** Ranked document ids, best first. */
  rank(query: string, candidates: { docId: string; text: string }[]): Promise<string[]>;
}

/**
 * A routing measurement under one retriever.
 *
 * There is no field for a single headline number, and that is intentional.
 * A percentage without its floor is unreadable: 60% across 3 documents is
 * worse than chance-adjacent, 60% across 200 is extraordinary.
 */
export interface Measurement {
  retriever: string;
  /** Random selection, 1/N. The score to beat. */
  floor: number;
  /** Routing using only the navigation surface. */
  observed: number;
  /** Routing with full bodies available. What perfect navigation would reach. */
  ceiling: number;
  /** Per-probe outcomes, so any disputed score can be resolved by diffing. */
  outcomes: { probe: Probe; picked: string | null; hit: boolean }[];
}

/**
 * A complete run.
 *
 * Both retrievers are required. Reporting one alone is how keyword stuffing
 * goes undetected: a stuffed index scores high lexically and flat semantically,
 * so the divergence between them is the entire cheat detector.
 */
export interface Run {
  corpus: { root: string; docs: number };
  surface: NavigationSurface["kind"];
  probes: { supplied: number; generated: number; fixture: number };
  lexical: Measurement;
  semantic: Measurement;
  warnings: Warning[];
  /** True when probe count is too low for the result to mean much. */
  lowConfidence: boolean;
}

export type Warning =
  | { kind: "keyword-stuffing"; lexicalLead: number; note: string }
  | { kind: "low-ceiling"; ceiling: number; note: string }
  | { kind: "implicit-index"; note: string }
  | { kind: "low-probe-count"; probes: number; note: string };

/** Ungrounded rate is derived, never stored, so it can never drift from its inputs. */
export function ungroundedRate(m: Measurement): number {
  return 1 - m.observed;
}

/**
 * The finding: how much of the corpus's own information the navigation surface
 * fails to expose. This, not the raw observed score, is what the tool is for.
 */
export function reachableGap(m: Measurement): number {
  return Math.max(0, m.ceiling - m.observed);
}

/**
 * Where documents come from.
 *
 * The core never touches a filesystem. Every surface this tool will grow into
 * supplies documents differently: a CLI walks a directory, an MCP server is
 * handed them in memory, a CI action reads a checkout, a hosted runner pulls
 * from a git provider, a browser has no filesystem at all.
 *
 * Binding the analysis to `node:fs` would make each of those a rewrite rather
 * than an adapter, so it is an interface from the first commit.
 */
export interface CorpusSource {
  readonly name: string;
  /** Document ids, corpus-root-relative, stable across calls. */
  list(): Promise<string[]>;
  /** Raw file contents, frontmatter included. */
  read(id: string): Promise<string>;
  /** The index file if the corpus has one. Undefined means implicit surface. */
  indexPath?(): Promise<string | undefined>;
}

export interface AnalyzeOptions {
  /** Real queries beat generated ones. See METHOD.md. */
  probes?: Probe[];
  /** Defaults to lexical only, which needs no network and no key. */
  retrievers?: Retriever[];
  /** Probes generated per document when none are supplied. */
  probesPerDoc?: number;
  /** Progress for long runs. Surfaces decide how to display it, core never prints. */
  onProgress?: (event: { phase: string; done: number; total: number }) => void;
}
