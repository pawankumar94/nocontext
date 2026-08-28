/**
 * Floor, observed and ceiling for one retriever.
 *
 * Three numbers, never one. See METHOD.md.
 */
import type { Doc, Measurement, NavigationSurface, Probe, Retriever } from "../types.js";

async function routeAll(
  retriever: Retriever,
  probes: Probe[],
  candidates: { docId: string; text: string }[],
): Promise<{ probe: Probe; picked: string | null; hit: boolean }[]> {
  return Promise.all(probes.map(async (probe) => {
    const ranked = await retriever.rank(probe.question, candidates);
    const picked = ranked[0] ?? null;
    return { probe, picked, hit: picked === probe.expect };
  }));
}

const rate = (outcomes: { hit: boolean }[]) =>
  outcomes.length ? outcomes.filter((o) => o.hit).length / outcomes.length : 0;

export async function measure(
  retriever: Retriever,
  docs: Doc[],
  surface: NavigationSurface,
  probes: Probe[],
): Promise<Measurement> {
  // Observed: only what the agent sees before opening anything.
  const observed = await routeAll(retriever, probes, surface.entries);

  // Ceiling: the same routing with full bodies available. This is what the
  // corpus makes possible, so the distance from observed is the part the
  // index is responsible for.
  const ceiling = await routeAll(
    retriever,
    probes,
    docs.map((d) => ({ docId: d.id, text: `${d.title}\n${d.body}` })),
  );

  return {
    retriever: `${retriever.name}@${retriever.version}`,
    floor: docs.length ? 1 / docs.length : 0,
    observed: rate(observed),
    ceiling: rate(ceiling),
    outcomes: observed,
  };
}
