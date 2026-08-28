/**
 * Full run record.
 *
 * METHOD.md promises that a disputed score is resolvable by exchanging this
 * file, so it carries the probes and per-probe outcomes, not just totals.
 */
import { reachableGap, routingMissRate, type Measurement, type Run } from "../core/types.js";
import type { RunComparison } from "../core/comparison.js";

export function renderJson(run: Run, comparison?: RunComparison): string {
  const derived = (measurement: Measurement) => ({
    routingMissRate: routingMissRate(measurement),
    reachableGap: reachableGap(measurement),
  });
  return JSON.stringify({
    ...run,
    derived: {
      lexical: derived(run.lexical),
      semantic: run.semantic ? derived(run.semantic) : undefined,
    },
    comparison,
  }, null, 2);
}
