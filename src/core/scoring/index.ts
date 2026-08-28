/**
 * Floor, observed and ceiling for one retriever, in standard IR metrics.
 *
 * MRR and Recall@k are reported because ContextBench and Agent Retrieval Bench
 * report them. Inventing a scale would make this incomparable to the published
 * work it sits beside.
 */
import type {
  Doc, Floor, Measurement, NavigationSurface, Probe, RankMetrics, Retriever,
} from "../types.js";

type Outcome = Measurement["outcomes"][number];

async function route(
  retriever: Retriever,
  probes: Probe[],
  candidates: { docId: string; text: string }[],
): Promise<Outcome[]> {
  const rankings = retriever.rankMany
    ? await retriever.rankMany(probes.map((probe) => probe.question), candidates)
    : await Promise.all(probes.map((probe) => retriever.rank(probe.question, candidates)));
  return probes.map((probe, index) => {
    const ranked = rankings[index] ?? [];
    const expected = Array.isArray(probe.expect) ? probe.expect : [probe.expect];
    const positions = expected.map((docId) => ranked.indexOf(docId)).filter((at) => at >= 0);
    const at = positions.length ? Math.min(...positions) : -1;
    return {
      probe,
      picked: ranked[0] ?? null,
      rank: at === -1 ? null : at + 1,
      hit: ranked[0] !== undefined && expected.includes(ranked[0]),
    };
  });
}

function metrics(outcomes: Outcome[]): RankMetrics {
  const n = outcomes.length || 1;
  const within = (k: number) =>
    outcomes.filter((o) => o.rank !== null && o.rank <= k).length / n;
  return {
    p1: outcomes.filter((o) => o.hit).length / n,
    mrr: outcomes.reduce((s, o) => s + (o.rank ? 1 / o.rank : 0), 0) / n,
    recall: { at1: within(1), at3: within(3), at5: within(5) },
  };
}

/**
 * Expected metrics from ranking N documents at random.
 *
 * Recall@k is k/N. MRR is the mean reciprocal rank over a uniform permutation,
 * which is the Nth harmonic number over N. Both shrink as a corpus grows, which
 * is exactly why a raw score means nothing without them.
 */
export function randomFloor(n: number): Floor {
  if (n <= 0) return { p1: 0, mrr: 0, recall: { at1: 0, at3: 0, at5: 0 } };
  let harmonic = 0;
  for (let i = 1; i <= n; i++) harmonic += 1 / i;
  const at = (k: number) => Math.min(1, k / n);
  return { p1: 1 / n, mrr: harmonic / n, recall: { at1: at(1), at3: at(3), at5: at(5) } };
}

export async function measure(
  retriever: Retriever,
  docs: Doc[],
  surface: NavigationSurface,
  probes: Probe[],
): Promise<Measurement> {
  const observed = await route(retriever, probes, surface.entries);
  const ceiling = await route(
    retriever, probes,
    docs.map((d) => ({ docId: d.id, text: `${d.title}\n${d.body}` })),
  );
  return {
    retriever: `${retriever.name}@${retriever.version}`,
    floor: randomFloor(docs.length),
    observed: metrics(observed),
    ceiling: metrics(ceiling),
    outcomes: observed,
  };
}
