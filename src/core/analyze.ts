/**
 * The one entry point.
 *
 * Every surface calls this and nothing else. It returns data and never prints,
 * never exits, never throws for control flow. Formatting lives in ../report.
 */
import { loadDocs, buildSurface } from "./corpus/index.js";
import { lexical } from "./retrievers/lexical.js";
import { measure } from "./scoring/index.js";
import type { AnalyzeOptions, CorpusSource, Measurement, Run, Warning } from "./types.js";

/** Below this, a run is noise. Chosen to be visible, not defensible. */
const MIN_PROBES = 12;
/** Lexical leading semantic by more than this reads as keyword stuffing. */
const STUFFING_LEAD = 0.2;

function warningsFor(
  lex: Measurement,
  sem: Measurement | undefined,
  surfaceKind: Run["surface"],
  probeCount: number,
): Warning[] {
  const out: Warning[] = [];
  if (surfaceKind === "implicit") {
    out.push({
      kind: "implicit-index",
      note: "No index found. The file tree was scored as the navigation surface, " +
        "which is not comparable to a corpus that has a real index.",
    });
  }
  if (lex.ceiling < 0.5) {
    out.push({
      kind: "low-ceiling",
      ceiling: lex.ceiling,
      note: "Full-text routing is weak, so the answers may not be in the corpus. " +
        "This is not an index problem and rewriting the index will not fix it.",
    });
  }
  if (sem) {
    const lead = lex.observed - sem.observed;
    if (lead > STUFFING_LEAD) {
      out.push({
        kind: "keyword-stuffing",
        lexicalLead: lead,
        note: "The index scores far better lexically than semantically, which is " +
          "what an index padded with query vocabulary looks like. Treat the " +
          "lexical number with suspicion.",
      });
    }
  }
  if (probeCount < MIN_PROBES) {
    out.push({
      kind: "low-probe-count",
      probes: probeCount,
      note: `Fewer than ${MIN_PROBES} probes. The result is indicative at best.`,
    });
  }
  return out;
}

export async function analyze(
  source: CorpusSource,
  options: AnalyzeOptions = {},
): Promise<Run> {
  const docs = await loadDocs(source);
  const surface = await buildSurface(source, docs);
  const probes = options.probes ?? [];

  const retrievers = options.retrievers?.length ? options.retrievers : [lexical];
  const results = new Map<string, Measurement>();
  let done = 0;
  for (const r of retrievers) {
    options.onProgress?.({ phase: `routing:${r.name}`, done, total: retrievers.length });
    results.set(r.name, await measure(r, docs, surface, probes));
    done += 1;
  }

  const lex = results.get("bm25") ?? [...results.values()][0]!;
  const sem = [...results.entries()].find(([k]) => k !== "bm25")?.[1];

  return {
    corpus: { root: source.name, docs: docs.length },
    surface: surface.kind,
    probes: {
      supplied: probes.filter((p) => p.origin === "supplied").length,
      generated: probes.filter((p) => p.origin === "generated").length,
      fixture: probes.filter((p) => p.origin === "fixture").length,
    },
    lexical: lex,
    // Absent until the semantic retriever lands. Reported, never averaged.
    semantic: sem ?? { ...lex, retriever: "none", outcomes: [] },
    warnings: warningsFor(lex, sem, surface.kind, probes.length),
    lowConfidence: probes.length < MIN_PROBES,
  };
}
