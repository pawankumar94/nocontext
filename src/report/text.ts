/** Terminal output. Formatting only, no measurement. */
import { reachableGap, ungroundedRate, type Run } from "../core/types.js";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const pad = (s: string, n: number) => s.padEnd(n);

export function renderText(run: Run, color = true): string {
  const c = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const dim = (s: string) => c("2", s);
  const amber = (s: string) => c("33", s);

  const m = run.lexical;
  const out: string[] = [""];

  out.push(`  ${amber(pad("ungrounded rate", 22))}${pct(ungroundedRate(m))}${dim("  (1 - P@1)")}`);
  out.push("");
  out.push(`  ${dim(pad("", 22))}${pad("P@1", 8)}${pad("MRR", 8)}${pad("R@3", 8)}R@5`);
  out.push(`  ${dim(pad("floor (random)", 22))}${pad(pct(m.floor.p1), 8)}${pad(m.floor.mrr.toFixed(2), 8)}${pad(pct(m.floor.recall.at3), 8)}${pct(m.floor.recall.at5)}`);
  out.push(`  ${dim(pad("observed (index)", 22))}${pad(pct(m.observed.p1), 8)}${pad(m.observed.mrr.toFixed(2), 8)}${pad(pct(m.observed.recall.at3), 8)}${pct(m.observed.recall.at5)}${dim(run.surface === "implicit" ? "  file tree, no index" : "")}`);
  out.push(`  ${dim(pad("ceiling (full text)", 22))}${pad(pct(m.ceiling.p1), 8)}${pad(m.ceiling.mrr.toFixed(2), 8)}${pad(pct(m.ceiling.recall.at3), 8)}${pct(m.ceiling.recall.at5)}`);
  out.push("");

  const gap = reachableGap(m);
  out.push(gap > 0.01
    ? `  ${Math.round(gap * 100)} points of your own information is not reachable from your index.`
    : `  Your index exposes everything the corpus can answer.`);

  const missed = m.outcomes.filter((o) => !o.hit);
  if (missed.length) {
    out.push("");
    out.push(`  ${dim("unreachable")}`);
    for (const o of missed.slice(0, 8)) {
      out.push(`    ${amber("[ ]")} ${o.probe.question}`);
      out.push(`        ${dim(`answer is in ${o.probe.expect}`)}`);
    }
    if (missed.length > 8) out.push(`    ${dim(`and ${missed.length - 8} more`)}`);
  }

  for (const w of run.warnings) {
    out.push("");
    out.push(`  ${amber("!")} ${w.note}`);
  }

  out.push("");
  out.push(`  ${dim(`${m.retriever} · ${m.outcomes.length} probes`)}`);
  out.push("");
  return out.join("\n");
}
