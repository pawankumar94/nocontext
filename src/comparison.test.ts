import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./core/analyze.js";
import { compareRuns } from "./core/comparison.js";
import { lexical } from "./core/retrievers/lexical.js";
import type { CorpusSource, Probe } from "./core/types.js";

const probes: Probe[] = [{
  question: "When do database migrations run?",
  expect: "docs/deploy.md",
  origin: "supplied",
}];

function source(index: string): CorpusSource {
  const files = new Map([
    ["docs/deploy.md", "# Deploy\nDatabase migrations run before deployment."],
    ["docs/other.md", "# Other\nUnrelated content."],
    ["index.md", index],
  ]);
  return {
    name: "same-corpus",
    async list() { return ["docs/deploy.md", "docs/other.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "index.md"; },
  };
}

test("paired evaluation comparison reports routing improvement", async () => {
  const before = await analyze(source(
    "[Deploy](docs/deploy.md) Release rules\n[Other](docs/other.md) Database migration FAQ",
  ), { probes, retrievers: [lexical] });
  const after = await analyze(source(
    "[Deploy](docs/deploy.md) Database migration timing\n[Other](docs/other.md) Miscellaneous",
  ), { probes, retrievers: [lexical] });
  const comparison = compareRuns(before, after);
  assert.equal(comparison.compatible, true);
  assert.equal(comparison.lexical?.p1, 1);
});

test("paired evaluation comparison rejects changed probes", async () => {
  const baseline = await analyze(source("[Deploy](docs/deploy.md) Database migrations"), {
    probes,
    retrievers: [lexical],
  });
  const changed = await analyze(source("[Deploy](docs/deploy.md) Database migrations"), {
    probes: [{ ...probes[0]!, question: "Do migrations run first?" }],
    retrievers: [lexical],
  });
  const comparison = compareRuns(baseline, changed);
  assert.equal(comparison.compatible, false);
  assert.ok(comparison.errors.includes("probe sets or ordering differ"));
});

test("paired evaluation comparison rejects changed document content", async () => {
  const baseline = await analyze(source("[Deploy](docs/deploy.md) Database migrations"), {
    probes,
    retrievers: [lexical],
  });
  const changedSource = source("[Deploy](docs/deploy.md) Database migrations");
  const originalRead = changedSource.read.bind(changedSource);
  changedSource.read = async (id) => id === "docs/other.md"
    ? "# Other\nChanged unrelated content."
    : originalRead(id);
  const changed = await analyze(changedSource, { probes, retrievers: [lexical] });
  const comparison = compareRuns(baseline, changed);
  assert.equal(comparison.compatible, false);
  assert.ok(comparison.errors.includes("document contents differ"));
});
