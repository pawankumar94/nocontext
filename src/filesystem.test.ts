import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileSystemSource } from "./sources/filesystem.js";

test("filesystem source prefers agent instructions and reports the selected surface", async () => {
  const root = await mkdtemp(join(tmpdir(), "nocontext-surface-"));
  try {
    await writeFile(join(root, "AGENTS.md"), "[Runbook](runbook.md) Deployment recovery\n");
    await writeFile(join(root, "README.md"), "[Runbook](runbook.md) Generic docs\n");
    await writeFile(join(root, "runbook.md"), "# Runbook\nRollback a failed deployment.\n");
    const source = fileSystemSource(root);
    assert.equal(await source.indexPath?.(), "AGENTS.md");
    assert.deepEqual(await source.list(), ["README.md", "runbook.md"]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("filesystem source accepts an explicit in-corpus surface", async () => {
  const root = await mkdtemp(join(tmpdir(), "nocontext-surface-"));
  try {
    await writeFile(join(root, "AGENTS.md"), "Agent navigation\n");
    await writeFile(join(root, "README.md"), "Readme navigation\n");
    const source = fileSystemSource(root, { surface: "README.md" });
    assert.equal(await source.indexPath?.(), "README.md");
    assert.deepEqual(await source.list(), ["AGENTS.md"]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("filesystem source rejects surfaces outside the corpus", () => {
  assert.throws(
    () => fileSystemSource("/tmp/corpus", { surface: "../secret.md" }),
    /must be a file inside the corpus/,
  );
});

test("filesystem source skips broken and out-of-corpus Markdown symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "nocontext-surface-"));
  const outside = join(tmpdir(), `nocontext-outside-${Date.now()}.md`);
  try {
    await writeFile(join(root, "AGENTS.md"), "Agent navigation\n");
    await writeFile(join(root, "inside.md"), "# Inside\nSafe document.\n");
    await writeFile(outside, "# Outside\nMust not be read.\n");
    await symlink("inside.md", join(root, "valid.md"));
    await symlink("missing.md", join(root, "broken.md"));
    await symlink(outside, join(root, "outside.md"));
    const source = fileSystemSource(root);
    assert.deepEqual(await source.list(), ["inside.md", "valid.md"]);
  } finally {
    await rm(root, { recursive: true });
    await rm(outside, { force: true });
  }
});

test("filesystem source scopes documents to explicit files and directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "nocontext-surface-"));
  try {
    await mkdir(join(root, "docs"));
    await mkdir(join(root, "packages"));
    await writeFile(join(root, "AGENTS.md"), "Use docs/runbook.md for incidents.\n");
    await writeFile(join(root, "CONTRIBUTING.md"), "# Contributing\nOpen a pull request.\n");
    await writeFile(join(root, "docs", "runbook.md"), "# Runbook\nIncident response.\n");
    await writeFile(join(root, "packages", "README.md"), "# Package\nGenerated package notes.\n");
    const source = fileSystemSource(root, { include: ["docs", "CONTRIBUTING.md"] });
    assert.deepEqual(await source.list(), ["CONTRIBUTING.md", "docs/runbook.md"]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("filesystem source rejects included paths outside the corpus", () => {
  assert.throws(
    () => fileSystemSource("/tmp/corpus", { include: ["../secret"] }),
    /included path must be inside the corpus/,
  );
});

test("filesystem source refuses reads and surfaces that resolve outside the corpus", async () => {
  const root = await mkdtemp(join(tmpdir(), "nocontext-surface-"));
  const outside = join(tmpdir(), `nocontext-outside-${Date.now()}.md`);
  try {
    await writeFile(join(root, "AGENTS.md"), "Agent navigation\n");
    await writeFile(outside, "# Outside\nMust not be read.\n");
    await symlink(outside, join(root, "outside.md"));
    const source = fileSystemSource(root);
    await assert.rejects(() => source.read("../outside.md"), /must be inside the corpus/);
    await assert.rejects(() => source.read("outside.md"), /resolves outside the corpus/);
    const unsafeSurface = fileSystemSource(root, { surface: "outside.md" });
    await assert.rejects(() => unsafeSurface.indexPath!(), /unavailable or outside the corpus/);
  } finally {
    await rm(root, { recursive: true });
    await rm(outside, { force: true });
  }
});
