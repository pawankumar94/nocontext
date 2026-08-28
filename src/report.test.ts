import { test } from "node:test";
import assert from "node:assert/strict";
import { renderText } from "./report/text.js";
import type { Run } from "./core/types.js";

const measurement = {
  retriever: "semantic@test",
  floor: { p1: 0.5, mrr: 0.75, recall: { at1: 0.5, at3: 1, at5: 1 } },
  observed: { p1: 1, mrr: 1, recall: { at1: 1, at3: 1, at5: 1 } },
  ceiling: { p1: 0.5, mrr: 0.75, recall: { at1: 0.5, at3: 1, at5: 1 } },
  outcomes: [],
};

test("text output calls full text a reference and exposes extractor version", () => {
  const run: Run = {
    corpus: { root: "test", docs: 2, fingerprint: "test" },
    mode: "evaluate",
    surface: "explicit",
    surfaceSource: "AGENTS.md",
    surfaceExtractor: "pointer-block@1",
    surfaceCoverage: { described: 2, total: 2 },
    probes: { supplied: 1, generated: 0, fixture: 0 },
    lexical: measurement,
    semantic: measurement,
    findings: [],
    warnings: [],
    lowConfidence: true,
  };
  const text = renderText(run, false);
  assert.match(text, /extractor: pointer-block@1/);
  assert.match(text, /full-text reference/);
  assert.match(text, /map outperforms the full-text reference by 50 points/);
  assert.doesNotMatch(text, /unreachable/);
});
