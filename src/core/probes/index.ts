/** Structural validation for supplied or host-agent-generated probes. */
import type { Doc, Probe } from "../types.js";

export function validateProbes(docs: Doc[], probes: Probe[]): string[] {
  const errors: string[] = [];
  if (!probes.length) errors.push("probe set is empty");
  const docIds = new Set(docs.map((doc) => doc.id));
  const seen = new Set<string>();
  const origins = new Set(probes.map((probe) => probe.origin));
  if (origins.size > 1) {
    errors.push(`probe origins cannot be blended: ${[...origins].sort().join(", ")}`);
  }
  for (const [index, probe] of probes.entries()) {
    const label = `probe ${index + 1}`;
    const question = probe.question.trim();
    if (!(["supplied", "generated", "fixture", "topic"] as unknown[]).includes(probe.origin)) {
      errors.push(`${label} has invalid origin ${String(probe.origin)}`);
    }
    if (!question) errors.push(`${label} has an empty question`);
    if (seen.has(question.toLowerCase())) errors.push(`${label} duplicates an earlier question`);
    seen.add(question.toLowerCase());
    const expected = Array.isArray(probe.expect) ? probe.expect : [probe.expect];
    if (!expected.length) errors.push(`${label} has no expected document`);
    for (const docId of expected) {
      if (!docIds.has(docId)) errors.push(`${label} expects missing document ${docId}`);
    }
  }
  return errors;
}
