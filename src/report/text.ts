/** Terminal output. Formatting only, no measurement. */
import { mapGap, routingMissRate, type Measurement, type Run } from "../core/types.js";
import type { RunComparison } from "../core/comparison.js";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const pad = (s: string, n: number) => s.padEnd(n);

export function renderText(run: Run, color = true, comparison?: RunComparison): string {
  const c = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const dim = (s: string) => c("2", s);
  const amber = (s: string) => c("33", s);

  const surface = run.surfaceSource ?? "file tree (no navigation file found)";
  const out: string[] = [
    "",
    `  ${run.mode} run · surface: ${surface}`,
    `  corpus: ${run.corpus.docs} documents · described by surface: ${run.surfaceCoverage.described}`,
    `  extractor: ${run.surfaceExtractor}`,
  ];

  const addMeasurement = (label: string, m: Measurement) => {
    out.push(`  ${label}  ${dim(m.retriever)}`);
    out.push(`  ${amber(pad("top-1 routing miss", 22))}${pct(routingMissRate(m))}${dim("  (1 - P@1)")}`);
    out.push("");
    out.push(`  ${dim(pad("", 22))}${pad("P@1", 8)}${pad("MRR", 8)}${pad("R@3", 8)}R@5`);
    out.push(`  ${dim(pad("floor (random)", 22))}${pad(pct(m.floor.p1), 8)}${pad(m.floor.mrr.toFixed(2), 8)}${pad(pct(m.floor.recall.at3), 8)}${pct(m.floor.recall.at5)}`);
    out.push(`  ${dim(pad("observed (index)", 22))}${pad(pct(m.observed.p1), 8)}${pad(m.observed.mrr.toFixed(2), 8)}${pad(pct(m.observed.recall.at3), 8)}${pct(m.observed.recall.at5)}${dim(run.surface === "implicit" ? "  file tree, no index" : "")}`);
    out.push(`  ${dim(pad("full-text reference", 22))}${pad(pct(m.ceiling.p1), 8)}${pad(m.ceiling.mrr.toFixed(2), 8)}${pad(pct(m.ceiling.recall.at3), 8)}${pct(m.ceiling.recall.at5)}`);
    out.push("");
  };

  addMeasurement("lexical", run.lexical);
  if (run.semantic) addMeasurement("semantic", run.semantic);

  const addGap = (label: string, measurement: Measurement) => {
    const gap = mapGap(measurement);
    out.push(gap > 0.01
      ? `  ${label} map gap: ${Math.round(gap * 100)} points.`
      : gap < -0.01
        ? `  ${label} map outperforms the full-text reference by ${Math.round(-gap * 100)} points.`
        : `  ${label} map gap: 0 points.`);
  };
  addGap("lexical", run.lexical);
  if (run.semantic) addGap("semantic", run.semantic);

  const missed = run.lexical.outcomes.filter((o) => !o.hit);
  if (missed.length) {
    out.push("");
    out.push(`  ${dim("lexical top-1 index misses")}`);
    for (const o of missed.slice(0, 8)) {
      out.push(`    ${amber("[ ]")} ${o.probe.question}`);
      const expected = Array.isArray(o.probe.expect) ? o.probe.expect.join(", ") : o.probe.expect;
      out.push(`        ${dim(`answer is in ${expected}`)}`);
    }
    if (missed.length > 8) out.push(`    ${dim(`and ${missed.length - 8} more`)}`);
  }

  if (run.findings.length) {
    out.push("");
    out.push(`  ${dim("miss diagnosis and navigation edits to test")}`);
    for (const finding of run.findings.slice(0, 8)) {
      out.push(`    ${amber("[ ]")} ${finding.expected.join(", ")}`);
      out.push(`        ${finding.question}`);
      out.push(`        ${dim(finding.kind.replace(/-/g, " "))}`);
      const lexicalRank = finding.lexical.rank === null ? "not ranked" : `expected rank ${finding.lexical.rank}`;
      out.push(`        ${dim(`lexical picked ${finding.lexical.picked ?? "nothing"}; ${lexicalRank}`)}`);
      if (finding.semantic) {
        const semanticRank = finding.semantic.rank === null
          ? "not ranked"
          : `expected rank ${finding.semantic.rank}`;
        out.push(`        ${dim(`semantic picked ${finding.semantic.picked ?? "nothing"}; ${semanticRank}`)}`);
      }
      out.push(`        ${dim(finding.missingTerms.length
        ? `terms present in the source but missing from its entry: ${finding.missingTerms.join(", ")}`
        : "no source-grounded query terms to add; inspect the entry and gold document manually")}`);
    }
    if (run.findings.length > 8) out.push(`    ${dim(`and ${run.findings.length - 8} more`)}`);
  }

  for (const w of run.warnings) {
    out.push("");
    out.push(`  ${amber("!")} ${w.note}`);
  }

  if (comparison) {
    out.push("");
    if (!comparison.compatible) {
      out.push(`  ${amber("!")} baseline is not comparable: ${comparison.errors.join("; ")}`);
    } else {
      const signedPct = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(0)} points`;
      out.push(`  ${dim("held-out change from baseline")}`);
      out.push(`    lexical P@1 ${signedPct(comparison.lexical!.p1)}`);
      if (comparison.semantic) out.push(`    semantic P@1 ${signedPct(comparison.semantic.p1)}`);
    }
  }

  out.push("");
  const retrievers = [run.lexical.retriever, run.semantic?.retriever].filter(Boolean).join(" + ");
  out.push(`  ${dim(`${retrievers} · ${run.lexical.outcomes.length} probes`)}`);
  out.push("");
  return out.join("\n");
}
