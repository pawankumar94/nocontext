import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSurface, loadDocs } from "./core/corpus/index.js";
import { analyze } from "./core/analyze.js";
import { lexical } from "./core/retrievers/lexical.js";
import type { CorpusSource } from "./core/types.js";

test("a basename mention does not fabricate links to duplicate nested documents", async () => {
  const files = new Map([
    ["AGENTS.md", "Read docs/AGENTS.md before editing documentation."],
    ["docs/AGENTS.md", "# Docs instructions\nWrite public documentation."],
    ["tools/AGENTS.md", "# Tool instructions\nMaintain build tools."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/AGENTS.md", "tools/AGENTS.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const docs = await loadDocs(source);
  const surface = await buildSurface(source, docs);
  assert.equal(surface.kind, "explicit");
  assert.match(surface.entries.find((entry) => entry.docId === "docs/AGENTS.md")!.text, /docs\/AGENTS\.md/);
  assert.equal(surface.entries.find((entry) => entry.docId === "tools/AGENTS.md")!.text, "");
});

test("a surface in a subdirectory resolves sibling document paths", async () => {
  const files = new Map([
    ["docs/index.md", "[Deploy](deploy.md) Release procedure"],
    ["docs/deploy.md", "# Deploy\nRelease procedure."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/deploy.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "docs/index.md"; },
  };
  const docs = await loadDocs(source);
  const surface = await buildSurface(source, docs);
  assert.equal(surface.kind, "explicit");
  assert.equal(surface.extractor, "pointer-block@1");
  assert.match(surface.entries[0]!.text, /deploy\.md/);
});

test("pointer blocks retain their heading without borrowing adjacent pointers", async () => {
  const files = new Map([
    ["AGENTS.md", [
      "## Deploying safely",
      "- [Release runbook](docs/deploy.md): staged rollout and rollback.",
      "## Authentication",
      "- [Auth runbook](docs/auth.md): token and login failures.",
    ].join("\n")],
    ["docs/deploy.md", "# Deploy\nRelease procedure."],
    ["docs/auth.md", "# Auth\nAuthentication procedure."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/deploy.md", "docs/auth.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const surface = await buildSurface(source, await loadDocs(source));
  const deploy = surface.entries.find((entry) => entry.docId === "docs/deploy.md")!.text;
  const auth = surface.entries.find((entry) => entry.docId === "docs/auth.md")!.text;
  assert.match(deploy, /Deploying safely/);
  assert.doesNotMatch(deploy, /Authentication/);
  assert.match(auth, /Authentication/);
  assert.doesNotMatch(auth, /Deploying safely/);
});

test("pointer blocks exclude policy prose without a document pointer", async () => {
  const files = new Map([
    ["AGENTS.md", [
      "## Security policy",
      "Never put credentials in local files.",
      "- [Authentication guide](docs/auth.md): login and token configuration.",
    ].join("\n")],
    ["docs/auth.md", "# Auth\nAuthentication procedure."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/auth.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const surface = await buildSurface(source, await loadDocs(source));
  assert.match(surface.entries[0]!.text, /Security policy/);
  assert.doesNotMatch(surface.entries[0]!.text, /Never put credentials/);
});

test("a nested README reference does not become a root README entry", async () => {
  const files = new Map([
    ["AGENTS.md", "Update app-server/README.md when the API changes."],
    ["README.md", "# Project\nRoot overview."],
    ["app-server/README.md", "# App server\nProtocol documentation."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["README.md", "app-server/README.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const docs = await loadDocs(source);
  const surface = await buildSurface(source, docs);
  assert.equal(surface.entries.find((entry) => entry.docId === "README.md")!.text, "");
  assert.match(
    surface.entries.find((entry) => entry.docId === "app-server/README.md")!.text,
    /app-server\/README\.md/,
  );
});

test("example paths inside fenced code are not treated as navigation", async () => {
  const files = new Map([
    ["AGENTS.md", "```text\nREADME.md  # optional file\n```\nUse docs/runbook.md for incidents."],
    ["README.md", "# Project\nRoot overview."],
    ["docs/runbook.md", "# Runbook\nIncident response."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["README.md", "docs/runbook.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const docs = await loadDocs(source);
  const surface = await buildSurface(source, docs);
  assert.equal(surface.entries.find((entry) => entry.docId === "README.md")!.text, "");
  assert.match(surface.entries.find((entry) => entry.docId === "docs/runbook.md")!.text, /runbook/);
});

test("analysis reports sparse explicit-surface coverage", async () => {
  const files = new Map([
    ["AGENTS.md", "Use docs/runbook.md for incidents."],
    ["docs/runbook.md", "# Runbook\nIncident response."],
    ["docs/deploy.md", "# Deploy\nDeployment process."],
    ["docs/security.md", "# Security\nSecurity process."],
  ]);
  const source: CorpusSource = {
    name: "test",
    async list() { return ["docs/runbook.md", "docs/deploy.md", "docs/security.md"]; },
    async read(id) { return files.get(id)!; },
    async indexPath() { return "AGENTS.md"; },
  };
  const run = await analyze(source, { retrievers: [lexical] });
  assert.deepEqual(run.surfaceCoverage, { described: 1, total: 3 });
  assert.equal(run.warnings.some((warning) => warning.kind === "sparse-surface"), true);
});
