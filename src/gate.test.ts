/**
 * The phase 1 gate, from PLANNER.md and predicted publicly in the README
 * before this code existed.
 *
 * The four corpora hold byte-identical documents, so any difference between
 * them is the index and nothing else. That makes the ceilings a hard
 * invariant rather than an expectation: if they diverge, the implementation is
 * reading something it should not be.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { analyze } from "./core/analyze.js";
import { fileSystemSource } from "./sources/filesystem.js";
import { lexical } from "./core/retrievers/lexical.js";
import { semantic } from "./retrievers/semantic.js";
import type { Probe, Run } from "./core/types.js";

const ROOT = join(import.meta.dirname, "..", "examples");
const VARIANTS = ["human-index", "retrieval-index", "stuffed-index", "no-index"] as const;

async function run(variant: string): Promise<Run> {
  const dir = join(ROOT, variant);
  const raw = JSON.parse(await readFile(join(dir, "questions.json"), "utf8")) as {
    probes: { question: string; expect: string }[];
  };
  const probes: Probe[] = raw.probes.map((p) => ({ ...p, origin: "fixture" }));
  return analyze(fileSystemSource(dir), { probes, retrievers: [lexical, semantic] });
}

const runs = new Map<string, Run>();
for (const v of VARIANTS) runs.set(v, await run(v));

test("all variants report the same ceiling", () => {
  const ceilings = VARIANTS.map((v) => runs.get(v)!.lexical.ceiling.p1);
  assert.equal(new Set(ceilings).size, 1,
    `ceilings diverged: ${VARIANTS.map((v, i) => `${v}=${ceilings[i]}`).join(" ")}. ` +
    "The documents are byte-identical, so this is a bug in the implementation.");
});

test("semantic retrieval is present, pinned, and sees the same ceiling", () => {
  const measurements = VARIANTS.map((variant) => runs.get(variant)!.semantic);
  assert.ok(measurements.every(Boolean), "semantic retrieval did not run without an API key");
  assert.ok(measurements.every((measurement) => measurement!.retriever.includes("+751bff3")),
    "semantic result does not carry the pinned model revision");
  assert.equal(new Set(measurements.map((measurement) => measurement!.ceiling.p1)).size, 1,
    "semantic ceilings diverged across byte-identical documents");
});

test("semantic retrieval also prefers the honest retrieval index", () => {
  assert.ok(
    runs.get("retrieval-index")!.semantic!.observed.p1 >
      runs.get("human-index")!.semantic!.observed.p1,
    "retrieval-oriented descriptions did not improve semantic routing",
  );
});

test("all variants see the same corpus", () => {
  const counts = VARIANTS.map((v) => runs.get(v)!.corpus.docs);
  assert.equal(new Set(counts).size, 1, "variants disagree on how many documents exist");
  assert.equal(counts[0], 6);
});

test("an index written for retrieval beats one written for a person", () => {
  assert.ok(
    runs.get("retrieval-index")!.lexical.observed.p1 > runs.get("human-index")!.lexical.observed.p1,
    "rewriting the index around the words people ask in did not help, " +
    "which is the claim this project exists to make",
  );
});

test("no index scores worst", () => {
  const implicit = runs.get("no-index")!;
  assert.equal(implicit.surface, "implicit");
  for (const v of ["human-index", "retrieval-index", "stuffed-index"] as const) {
    assert.ok(implicit.lexical.observed.p1 <= runs.get(v)!.lexical.observed.p1,
      `no-index outscored ${v}, which should not be possible`);
  }
});

test("a probe-leaked index is rejected instead of rewarded", () => {
  const stuffed = runs.get("stuffed-index")!;
  assert.ok(stuffed.lexical.observed.p1 > runs.get("retrieval-index")!.lexical.observed.p1,
    "the stuffed corpus is meant to game BM25; if it stopped, it stopped being an adversary");
  assert.equal(
    stuffed.warnings.some((w) => w.kind === "probe-leakage"), true,
    "the adversarial surface copied the evaluation questions and was not rejected",
  );
});

test("an honest retrieval index does not trip the leakage warning", () => {
  assert.equal(
    runs.get("retrieval-index")!.warnings.some((w) => w.kind === "probe-leakage"), false,
    "retrieval-oriented descriptions were mistaken for copied evaluation questions",
  );
});

test("semantic retrieval does not invent evidence for blank navigation entries", async () => {
  const ranked = await semantic.rank("deployment rollback", [
    { docId: "linked.md", text: "Deployment and rollback procedure" },
    { docId: "unlinked.md", text: "" },
  ]);
  assert.deepEqual(ranked, ["linked.md"]);
});
