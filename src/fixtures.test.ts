/**
 * Guards the control in examples/.
 *
 * The four example corpora are only a valid experiment while their documents
 * and probes are identical and the index is the single variable. Drift there
 * would not throw, it would quietly turn a controlled comparison into an
 * uncontrolled one and every number downstream would be wrong in a way nobody
 * could see. So it is asserted rather than trusted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "examples");
const VARIANTS = ["human-index", "retrieval-index", "stuffed-index", "no-index"];

const docsOf = (v: string) => {
  const dir = join(ROOT, v, "docs");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort()
    .map((f) => ({ name: f, body: readFileSync(join(dir, f), "utf8") }));
};

test("every variant ships the same documents", () => {
  const base = docsOf(VARIANTS[0]!);
  assert.ok(base.length >= 6, "expected at least 6 documents");
  for (const v of VARIANTS.slice(1)) {
    assert.deepEqual(docsOf(v), base,
      `${v} documents differ from ${VARIANTS[0]}, the control is broken`);
  }
});

test("every variant ships the same probes", () => {
  const probes = (v: string) =>
    readFileSync(join(ROOT, v, "questions.json"), "utf8");
  const base = probes(VARIANTS[0]!);
  for (const v of VARIANTS.slice(1)) {
    assert.equal(probes(v), base, `${v} probes differ, the control is broken`);
  }
});

test("every probe names a document that exists", () => {
  const raw = readFileSync(join(ROOT, VARIANTS[0]!, "questions.json"), "utf8");
  const { probes } = JSON.parse(raw) as { probes: { expect: string }[] };
  assert.ok(probes.length >= 12, "too few probes to mean anything");
  for (const p of probes) {
    assert.ok(existsSync(join(ROOT, VARIANTS[0]!, p.expect)),
      `probe expects ${p.expect}, which does not exist`);
  }
});

test("the index is the only thing that varies", () => {
  const indexed = VARIANTS.filter((v) => existsSync(join(ROOT, v, "index.md")));
  assert.equal(indexed.length, 3, "expected exactly three indexed variants");
  const bodies = indexed.map((v) => readFileSync(join(ROOT, v, "index.md"), "utf8"));
  assert.equal(new Set(bodies).size, 3,
    "two variants share an index, so they are not distinct conditions");
  assert.ok(!existsSync(join(ROOT, "no-index", "index.md")),
    "no-index must have no index, it exercises the implicit-surface path");
});
