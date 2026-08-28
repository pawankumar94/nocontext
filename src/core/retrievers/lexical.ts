/**
 * BM25. Deterministic, no network, no key.
 *
 * This is a floor on retrieval difficulty rather than a prediction of what a
 * model would do. A model reading an index reasons about it and will beat
 * bag-of-words on a good index and a bad one alike. What survives is the
 * comparison: both surfaces face the same scorer.
 *
 * It also flatters keyword-stuffed indexes by construction, which is exactly
 * why METHOD.md forbids reporting it alone.
 *
 * Robertson & Zaragoza defaults, k1 1.2 and b 0.75. Changing either changes
 * every published score, so bump `version` if you do.
 */
import type { Retriever } from "../types.js";

const K1 = 1.2;
const B = 0.75;

// Function words only. Nothing domain-bearing, so no corpus is advantaged.
const STOP = new Set(
  ("a an the is are was were be been being do does did doing have has had of to in for on at by " +
   "with from as it its this that these those and or but if then than so we you i they he she " +
   "our your their my me us them what which who whom when where why how can could should would " +
   "will shall may might must not no nor too very just about into over under again further").split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`*_~>#|\[\]()]/g, " ")
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function bm25(
  query: string,
  candidates: { docId: string; text: string }[],
): { docId: string; score: number }[] {
  const docs = candidates.map((c) => ({ docId: c.docId, terms: tokenize(c.text) }));
  const n = docs.length;
  const avgdl = n ? docs.reduce((s, d) => s + d.terms.length, 0) / n : 0;

  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const qTerms = tokenize(query);
  return docs
    .map((d) => {
      const tf = new Map<string, number>();
      for (const t of d.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const q of qTerms) {
        const f = tf.get(q);
        if (!f) continue;
        const idf = Math.log(1 + (n - (df.get(q) ?? 0) + 0.5) / ((df.get(q) ?? 0) + 0.5));
        const norm = avgdl ? 1 - B + (B * d.terms.length) / avgdl : 1;
        score += idf * ((f * (K1 + 1)) / (f + K1 * norm));
      }
      return { docId: d.docId, score };
    })
    .sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId));
}

export const lexical: Retriever = {
  name: "bm25",
  version: "1.0.0",
  async rank(query, candidates) {
    // A zero score is no evidence at all. Returning an arbitrary ordering of
    // documents the query never matched would count as a hit by luck.
    return bm25(query, candidates).filter((r) => r.score > 0).map((r) => r.docId);
  },
};
