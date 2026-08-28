/**
 * The default, zero-config output. No metrics table, no floor/ceiling, no
 * retriever names — a maintainer reading this should never need to know
 * what P@1 means. Full metrics live behind --evaluate; this is the miss list
 * and the words to add, nothing else.
 *
 * Never call this a score. Topic probes (mechanical, no-model, from a
 * document's own heading — see core/probes/topic.ts) test coverage, not
 * phrasing: they can tell you a document is never pointed at, not that the
 * wording would fail a real question. That distinction is stated on every
 * line this renders when origin is "topic", not once at the top where it's
 * easy to miss.
 */
import type { Run } from "../core/types.js";

export function renderAssist(run: Run, questionsPath: string | undefined, color = true): string {
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

  if (isTopic) {
    out.push(`  ${total} topic probes from headings — coverage only (is the doc pointed at).`);
    out.push(`  Not how a person would ask. Not a score.`);
  } else {
    out.push(`  ${total} questions checked`);
  }

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
    out.push(isTopic
      ? `  ${dim("Every heading's document is pointed at somewhere. This did not check phrasing.")}`
      : `  ${dim("Every question routed to its document. Nothing to fix.")}`);
  }

  out.push("");
  if (isTopic) {
    out.push(`  ${dim("Coverage only, not real questions. For real phrasing, write questions from")}`);
    out.push(`  ${dim("the doc bodies yourself and pass --questions, or add --write-probes to keep")}`);
    out.push(`  ${dim("this run's probes for review instead of discarding them.")}`);
    if (questionsPath) {
      out.push(`  ${dim(`Saved at ${questionsPath}. Get full metrics with:`)}`);
      out.push(`  ${dim(`  nocontext . --questions ${questionsPath} --evaluate`)}`);
    }
  } else {
    out.push(`  ${dim(`Full metrics (P@1, MRR, Recall@k) and a comparable score:`)}`);
    out.push(`  ${dim(`  nocontext . --questions ${questionsPath} --evaluate`)}`);
  }
  out.push("");
  return out.join("\n");
}
