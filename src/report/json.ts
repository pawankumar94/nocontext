/**
 * Full run record.
 *
 * METHOD.md promises that a disputed score is resolvable by exchanging this
 * file, so it carries the probes and per-probe outcomes, not just totals.
 */
import { reachableGap, ungroundedRate, type Run } from "../core/types.js";

export function renderJson(run: Run): string {
  return JSON.stringify({
    ...run,
    derived: {
      ungroundedRate: ungroundedRate(run.lexical),
      reachableGap: reachableGap(run.lexical),
    },
  }, null, 2);
}
