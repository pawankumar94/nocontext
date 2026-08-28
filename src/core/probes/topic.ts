/**
 * Mechanical, no-model probe generation. Zero-config fallback for when
 * nothing better exists: no supplied query logs, no host agent to draft
 * realistic questions per docs/PROBES.md.
 *
 * This is deliberately weaker than a real question and says so in its own
 * output. It cannot simulate how a person phrases a question, so it doesn't
 * try — it extracts each document's own heading as a topic probe, which
 * tests whether the surface links the document at all (coverage), not
 * whether the surface's wording matches real phrasing (vocabulary). Never
 * call this a score without a human reviewing the list first; the CLI
 * enforces that by refusing to run --evaluate or --fail-under against
 * `origin: "topic"` probes.
 *
 * Reads document bodies only. The navigation surface is never passed in,
 * for the same reason it's withheld from host-agent generation: testing a
 * surface against a probe drawn from that same surface is circular.
 */
import type { Doc, Probe } from "../types.js";

const HEADING = /^#{1,3}\s+(.+)$/;

function firstHeading(body: string): string | undefined {
  for (const line of body.split(/\r?\n/)) {
    const m = HEADING.exec(line.trim());
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

/** One topic probe per document that has a heading, capped for a quick default run. */
export function generateTopicProbes(docs: Doc[], max = 12): Probe[] {
  const probes: Probe[] = [];
  for (const doc of docs) {
    const heading = firstHeading(doc.body) ?? doc.title;
    if (!heading) continue;
    probes.push({ question: heading, expect: doc.id, origin: "topic" });
    if (probes.length >= max) break;
  }
  return probes;
}
