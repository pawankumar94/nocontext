import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./core/analyze.js";
import { validateProbes } from "./core/probes/index.js";
import { lexical } from "./core/retrievers/lexical.js";
import type { CorpusSource, Doc, Probe, Retriever } from "./core/types.js";

const docs: Doc[] = [
  { id: "docs/deploy.md", title: "Deploy", body: "Database migrations run before deployment.", meta: {} },
  { id: "docs/other.md", title: "Other", body: "Unrelated content.", meta: {} },
];

test("probe validation catches duplicates and missing expected documents", () => {
  const probes: Probe[] = [
    { question: "When do migrations run?", expect: "docs/deploy.md", origin: "supplied" },
    { question: "When do migrations run?", expect: "docs/missing.md", origin: "supplied" },
  ];
  assert.deepEqual(validateProbes(docs, probes), [
    "probe 2 duplicates an earlier question",
    "probe 2 expects missing document docs/missing.md",
  ]);
});

test("probe validation rejects blended evidence sources", () => {
  const probes: Probe[] = [
    { question: "When do migrations run?", expect: "docs/deploy.md", origin: "supplied" },
    { question: "What does deployment do?", expect: "docs/deploy.md", origin: "generated" },
  ];
  assert.deepEqual(validateProbes(docs, probes), [
    "probe origins cannot be blended: generated, supplied",
  ]);
});

test("probe validation rejects empty sets and invalid runtime origins", () => {
  assert.deepEqual(validateProbes(docs, []), ["probe set is empty"]);
  const invalid = [{
    question: "When do migrations run?",
    expect: "docs/deploy.md",
    origin: "unknown",
  }] as unknown as Probe[];
  assert.deepEqual(validateProbes(docs, invalid), ["probe 1 has invalid origin unknown"]);
});

test("analyze assigns custom retrievers by family rather than name", async () => {
  const files = new Map([
    ["docs/deploy.md", "# Deploy\nDatabase migrations run before deployment."],
    ["index.md", "[Deploy](docs/deploy.md) Database migrations"],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/deploy.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "index.md"; },
  };
  const terms: Retriever = {
    name: "terms",
    family: "lexical",
    version: "1",
    async rank(_query, candidates) { return candidates.map((candidate) => candidate.docId); },
  };
  const vectors: Retriever = {
    name: "vectors",
    family: "semantic",
    version: "1",
    async rank(_query, candidates) { return candidates.map((candidate) => candidate.docId); },
  };
  const run = await analyze(source, {
    probes: [{ question: "When do migrations run?", expect: "docs/deploy.md", origin: "supplied" }],
    retrievers: [terms, vectors],
  });
  assert.equal(run.lexical.retriever, "terms@1");
  assert.equal(run.semantic?.retriever, "vectors@1");
});

test("a lexical miss reports source-grounded vocabulary absent from the index entry", async () => {
  const files = new Map([
    ["docs/deploy.md", "# Deploy\nDatabase migrations run before deployment."],
    ["docs/other.md", "# Other\nUnrelated content."],
    ["index.md", "[Deploy](docs/deploy.md) Release rules\n[Other](docs/other.md) Migration FAQ"],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/deploy.md", "docs/other.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "index.md"; },
  };
  const probes: Probe[] = [{
    question: "Do database migrations run before deployment?",
    expect: "docs/deploy.md",
    origin: "supplied",
  }];
  const run = await analyze(source, { probes, retrievers: [lexical], mode: "diagnose" });
  assert.equal(run.findings[0]?.kind, "lexical-vocabulary-gap");
  assert.deepEqual(run.findings[0]?.expected, ["docs/deploy.md"]);
  assert.deepEqual(run.findings[0]?.missingTerms, ["database", "migrations", "run", "before", "deployment"]);
});

test("evaluation runs do not expose suggestions from held-out questions", async () => {
  const files = new Map([
    ["docs/deploy.md", "# Deploy\nDatabase migrations run before deployment."],
    ["docs/other.md", "# Other\nUnrelated content."],
    ["index.md", "[Deploy](docs/deploy.md) Release rules\n[Other](docs/other.md) Migration FAQ"],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/deploy.md", "docs/other.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "index.md"; },
  };
  const probes: Probe[] = [{
    question: "Do database migrations run before deployment?",
    expect: "docs/deploy.md",
    origin: "supplied",
  }];
  const run = await analyze(source, { probes, retrievers: [lexical] });
  assert.equal(run.mode, "evaluate");
  assert.deepEqual(run.findings, []);
  assert.equal(run.warnings.some((warning) => warning.kind === "development-run"), false);
});
