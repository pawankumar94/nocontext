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
import type { Probe, Run } from "./core/types.js";

const ROOT = join(import.meta.dirname, "..", "examples");
const VARIANTS = ["human-index", "retrieval-index", "stuffed-index", "no-index"] as const;

async function run(variant: string): Promise<Run> {
  const dir = join(ROOT, variant);
  const raw = JSON.parse(await readFile(join(dir, "questions.json"), "utf8")) as {
    probes: { question: string; expect: string }[];
  };
  const probes: Probe[] = raw.probes.map((p) => ({ ...p, origin: "fixture" }));
  return analyze(fileSystemSource(dir), { probes });
}

const runs = new Map<string, Run>();
for (const v of VARIANTS) runs.set(v, await run(v));

test("all variants report the same ceiling", () => {
  const ceilings = VARIANTS.map((v) => runs.get(v)!.lexical.ceiling.p1);
  assert.equal(new Set(ceilings).size, 1,
    `ceilings diverged: ${VARIANTS.map((v, i) => `${v}=${ceilings[i]}`).join(" ")}. ` +
    "The documents are byte-identical, so this is a bug in the implementation.");
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

test("a stuffed index beats an honest one lexically, and nothing yet catches it", () => {
  const stuffed = runs.get("stuffed-index")!;
  assert.ok(stuffed.lexical.observed.p1 > runs.get("retrieval-index")!.lexical.observed.p1,
    "the stuffed corpus is meant to game BM25; if it stopped, it stopped being an adversary");
  // Documents the current hole rather than asserting it is fine. The semantic
  // retriever in phase 3 is what closes it, and this flips to an assertion then.
  assert.equal(
    stuffed.warnings.some((w) => w.kind === "keyword-stuffing"), false,
    "a stuffing warning fired without a semantic retriever, which cannot be right",
  );
});
