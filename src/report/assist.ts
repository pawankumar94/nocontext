/**
 * The default, zero-config output. No metrics table, no floor/ceiling, no
 * retriever names — a maintainer reading this should never need to know
 * what P@1 means. Full metrics live behind --evaluate; this is the miss list
 * and the words to add, nothing else.
 *
 * Never call this a score. If the probes are origin "topic" (mechanical,
 * no-model, coverage-only — see core/probes/topic.ts), say so plainly so
 * nobody mistakes an unreviewed heading list for evidence.
 */
import type { Run } from "../core/types.js";

export function renderAssist(run: Run, questionsPath: string, color = true): string {
  const c = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const dim = (s: string) => c("2", s);
  const amber = (s: string) => c("33", s);

  const surface = run.surfaceSource ?? "file tree (no navigation file found)";
  const total = run.lexical.outcomes.length;
  const misses = run.lexical.outcomes.filter((o) => !o.hit).length;
  const isTopic = run.lexical.outcomes.every((o) => o.probe.origin === "topic");

  const out: string[] = [
    "",
    `  surface   ${surface}  ${dim("(auto)")}`,
  ];

  out.push(isTopic
    ? `  ${total} topic probes from doc headings — mechanical, not real questions. See below.`
    : `  ${total} questions checked`);

  out.push(`  ${amber("top-1 miss")}  ${misses}/${total}`);
  out.push("");

  for (const finding of run.findings.slice(0, 10)) {
    const hit = finding.lexical.picked ?? "nothing";
    out.push(`  ${amber("[ ]")} "${finding.question}"`);
    out.push(`      hit ${hit}, gold is ${finding.expected.join(" or ")}`);
    if (finding.missingTerms.length) {
      out.push(`      ${dim(`add: ${finding.missingTerms.join(", ")}`)}`);
    } else if (finding.kind === "shared-navigation-gap") {
      out.push(`      ${dim("not linked anywhere in the surface — add a pointer, not just words")}`);
    }
  }
  if (run.findings.length > 10) out.push(`  ${dim(`and ${run.findings.length - 10} more`)}`);

  if (!run.findings.length && misses === 0) {
    out.push(`  ${dim("Every question routed to its document. Nothing to fix.")}`);
  }

  out.push("");
  if (isTopic) {
    out.push(`  ${dim(`These are mechanical topic checks, not real questions a person would ask.`)}`);
    out.push(`  ${dim(`Review or replace them at ${questionsPath}, then get a comparable score with:`)}`);
    out.push(`  ${dim(`  nocontext . --questions ${questionsPath} --evaluate`)}`);
  } else {
    out.push(`  ${dim(`Full metrics (P@1, MRR, Recall@k) and a comparable score:`)}`);
    out.push(`  ${dim(`  nocontext . --questions ${questionsPath} --evaluate`)}`);
  }
  out.push("");
  return out.join("\n");
}
