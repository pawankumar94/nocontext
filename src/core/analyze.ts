/**
 * The one entry point.
 *
 * Every surface calls this and nothing else. It returns data and never prints,
 * never exits, never throws for control flow. Formatting lives in ../report.
 */
import { loadDocs, buildSurface } from "./corpus/index.js";
import { lexical } from "./retrievers/lexical.js";
import { tokenize } from "./retrievers/lexical.js";
import { validateProbes } from "./probes/index.js";
import { measure } from "./scoring/index.js";
import type {
  AnalyzeOptions, CorpusSource, Doc, Finding, Measurement, NavigationSurface, Probe, Run, Warning,
} from "./types.js";

type RunSurface = NavigationSurface;

/** Below this, a run is noise. Chosen to be visible, not defensible. */
const MIN_PROBES = 12;
const LEAKAGE_MIN_TERMS = 4;

function corpusFingerprint(docs: Doc[]): string {
  let hash = 0xcbf29ce484222325n;
  const mask = 0xffffffffffffffffn;
  const canonical = [...docs].sort((a, b) => a.id.localeCompare(b.id)).map((doc) => ({
    id: doc.id,
    title: doc.title,
    body: doc.body,
    meta: Object.fromEntries(Object.entries(doc.meta).sort(([a], [b]) => a.localeCompare(b))),
  }));
  for (const char of JSON.stringify(canonical)) {
    hash ^= BigInt(char.charCodeAt(0));
    hash = (hash * 0x100000001b3n) & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}

function longestSharedRun(a: string[], b: string[]): number {
  let longest = 0;
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = b.length; j >= 1; j -= 1) {
      row[j] = a[i - 1] === b[j - 1] ? row[j - 1]! + 1 : 0;
      longest = Math.max(longest, row[j]!);
    }
  }
  return longest;
}

function leakedProbeCount(surface: RunSurface, probes: Probe[]): number {
  const byDoc = new Map(surface.entries.map((entry) => [entry.docId, tokenize(entry.text)]));
  return probes.filter((probe) => {
    const question = tokenize(probe.question);
    const expected = Array.isArray(probe.expect) ? probe.expect : [probe.expect];
    const required = Math.max(LEAKAGE_MIN_TERMS, Math.ceil(question.length * 0.8));
    return expected.some((docId) => longestSharedRun(question, byDoc.get(docId) ?? []) >= required);
  }).length;
}

function findingsFor(
  docs: Doc[],
  surface: RunSurface,
  lexical: Measurement,
  semanticMeasurement: Measurement | undefined,
): Finding[] {
  const docsById = new Map(docs.map((doc) => [doc.id, doc]));
  const entriesById = new Map(surface.entries.map((entry) => [entry.docId, entry.text]));
  return lexical.outcomes.flatMap((outcome, index) => {
    const semanticOutcome = semanticMeasurement?.outcomes[index];
    if (outcome.hit && (!semanticOutcome || semanticOutcome.hit)) return [];
    const expected = Array.isArray(outcome.probe.expect)
      ? outcome.probe.expect
      : [outcome.probe.expect];
    const bodyTerms = new Set(expected.flatMap((docId) => {
      const doc = docsById.get(docId);
      return doc ? tokenize(`${doc.title}\n${doc.body}`) : [];
    }));
    const surfaceTerms = new Set(expected.flatMap((docId) => tokenize(entriesById.get(docId) ?? "")));
    const missingTerms = [...new Set(tokenize(outcome.probe.question))]
      .filter((term) => bodyTerms.has(term) && !surfaceTerms.has(term))
      .slice(0, 8);
    const kind: Finding["kind"] = !outcome.hit && (!semanticOutcome || semanticOutcome.hit)
      ? "lexical-vocabulary-gap"
      : !outcome.hit && semanticOutcome && !semanticOutcome.hit
        ? "shared-navigation-gap"
        : "retriever-disagreement";
    return [{
      kind,
      question: outcome.probe.question,
      expected,
      lexical: { picked: outcome.picked, rank: outcome.rank },
      semantic: semanticOutcome
        ? { picked: semanticOutcome.picked, rank: semanticOutcome.rank }
        : undefined,
      missingTerms,
    }];
  });
}

function warningsFor(
  lex: Measurement,
  sem: Measurement | undefined,
  surface: RunSurface,
  probes: Probe[],
): Warning[] {
  const out: Warning[] = [];
  if (surface.kind === "implicit") {
    out.push({
      kind: "implicit-index",
      note: "No index found. The file tree was scored as the navigation surface, " +
        "which is not comparable to a corpus that has a real index.",
    });
  }
  const described = surface.entries.filter((entry) => entry.text.trim()).length;
  if (surface.kind === "explicit" && described < surface.entries.length / 2) {
    out.push({
      kind: "sparse-surface",
      described,
      total: surface.entries.length,
      note: `The navigation surface describes ${described} of ${surface.entries.length} documents. ` +
        "Unlinked documents have no explicit map pointer; use --include if this surface is not responsible for all of them.",
    });
  }
  for (const measurement of [lex, sem].filter((value): value is Measurement => Boolean(value))) {
    if (measurement.ceiling.p1 < 0.5) {
      out.push({
        kind: "low-ceiling",
        retriever: measurement.retriever,
        ceiling: measurement.ceiling.p1,
        note: `${measurement.retriever} full-text routing is below 50%. Its index score cannot ` +
          "separate a navigation problem from a retriever limitation.",
      });
    }
  }
  const leaked = leakedProbeCount(surface, probes);
  if (leaked >= Math.max(1, Math.ceil(probes.length * 0.1))) {
    out.push({
      kind: "probe-leakage",
      probes: leaked,
      note: `${leaked} probes closely match their index entries. The evaluation may be ` +
        "testing questions copied into the surface rather than retrieval quality.",
    });
  }
  if (probes.length < MIN_PROBES) {
    out.push({
      kind: "low-probe-count",
      probes: probes.length,
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
  const mode = options.mode ?? "evaluate";
  const probeErrors = validateProbes(docs, probes);

  const retrievers = options.retrievers?.length ? options.retrievers : [lexical];
  const results: { retriever: typeof retrievers[number]; measurement: Measurement }[] = [];
  const unavailable: Warning[] = [];
  let done = 0;
  for (const r of retrievers) {
    options.onProgress?.({ phase: `routing:${r.name}`, done, total: retrievers.length });
    try {
      results.push({ retriever: r, measurement: await measure(r, docs, surface, probes) });
    } catch (error) {
      if (!r.optional) throw error;
      unavailable.push({
        kind: "retriever-unavailable",
        retriever: r.name,
        note: `${r.name} was unavailable, so this run contains lexical results only: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
    done += 1;
  }

  const lex = results.find(({ retriever }) => retriever.family === "lexical")?.measurement;
  if (!lex) throw new Error("analyze requires one available lexical retriever");
  const sem = results.find(({ retriever }) => retriever.family === "semantic")?.measurement;

  return {
    corpus: { root: source.name, docs: docs.length, fingerprint: corpusFingerprint(docs) },
    mode,
    surface: surface.kind,
    surfaceSource: surface.source,
    surfaceExtractor: surface.extractor,
    surfaceCoverage: {
      described: surface.entries.filter((entry) => entry.text.trim()).length,
      total: surface.entries.length,
    },
    probes: {
      supplied: probes.filter((p) => p.origin === "supplied").length,
      generated: probes.filter((p) => p.origin === "generated").length,
      fixture: probes.filter((p) => p.origin === "fixture").length,
    },
    lexical: lex,
    semantic: sem,
    findings: mode === "diagnose" ? findingsFor(docs, surface, lex, sem) : [],
    warnings: [
      ...(mode === "diagnose" ? [{
        kind: "development-run" as const,
        note: "Development run. Use these misses to revise navigation, then score a separate " +
          "held-out probe file in evaluate mode.",
      }] : []),
      ...(probeErrors.length ? [{
        kind: "invalid-probes" as const,
        errors: probeErrors,
        note: `Probe set is invalid: ${probeErrors.join("; ")}`,
      }] : []),
      ...warningsFor(lex, sem, surface, probes),
      ...unavailable,
    ],
    lowConfidence: probes.length < MIN_PROBES,
  };
}
