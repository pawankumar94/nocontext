/**
 * The zero-config default path. This is the fix for a real critique: the CLI
 * previously required a reviewed --questions file before it would print
 * anything at all, which is a study protocol, not a linter. A maintainer who
 * clones and runs `nocontext .` with no other flags has to see a real,
 * honestly-labeled miss list, not an error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = promisify(execFile);
const CLI = join(import.meta.dirname, "surfaces", "cli.js");

async function corpus(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "nocontext-assist-"));
  await mkdir(join(dir, "docs"));
  await writeFile(join(dir, "docs", "deploy.md"),
    "# Deployment policy\n\nMigrations run before the app deploy.\n");
  await writeFile(join(dir, "index.md"),
    "- [Deployment policy](docs/deploy.md) — what must be true before a rollout\n");
  return dir;
}

test("bare invocation prints a miss list, not an error", async () => {
  const dir = await corpus();
  try {
    const { stdout } = await run("node", [CLI, dir, "--no-color"]);
    assert.match(stdout, /surface\s+index\.md/);
    assert.match(stdout, /topic probes/);
    assert.doesNotMatch(stdout, /P@1/, "assist mode must not print IR jargon");
    assert.doesNotMatch(stdout, /MRR/, "assist mode must not print IR jargon");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bare invocation never writes into the user's tree by default", async () => {
  const dir = await corpus();
  try {
    const { stdout } = await run("node", [CLI, dir, "--no-color"]);
    await assert.rejects(readFile(join(dir, "nocontext-topic-probes.json")),
      "a disposable topic-probe run must not land in the user's tree unless asked");
    assert.doesNotMatch(stdout, /nocontext-topic-probes\.json/,
      "default output should not point at a path in the user's tree either");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--write-probes keeps generated probes in the target directory and points at them", async () => {
  const dir = await corpus();
  try {
    const { stdout } = await run("node", [CLI, dir, "--write-probes", "--no-color"]);
    const path = join(dir, "nocontext-topic-probes.json");
    const written = JSON.parse(await readFile(path, "utf8")) as { origin: string; probes: unknown[] };
    assert.equal(written.origin, "topic");
    assert.ok(written.probes.length > 0);
    assert.match(stdout, /nocontext-topic-probes\.json/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("assist output labels topic probes as coverage-only, never a score", async () => {
  const dir = await corpus();
  try {
    const { stdout } = await run("node", [CLI, dir, "--no-color"]);
    assert.match(stdout, /coverage only/);
    assert.match(stdout, /[Nn]ot how a person would ask/);
    assert.match(stdout, /[Nn]ot a score/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--evaluate still requires real probes, assist mode does not bypass it", async () => {
  const dir = await corpus();
  try {
    await assert.rejects(run("node", [CLI, dir, "--evaluate", "--no-color"]));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--fail-under is rejected in assist mode, a topic run is never a gate", async () => {
  const dir = await corpus();
  try {
    await assert.rejects(run("node", [CLI, dir, "--fail-under", "50", "--no-color"]));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("supplying --questions opts out of assist mode and topic generation", async () => {
  const dir = await corpus();
  try {
    const qpath = join(dir, "q.json");
    await writeFile(qpath, JSON.stringify({
      origin: "supplied",
      probes: [{ question: "when do migrations run", expect: "docs/deploy.md" }],
    }));
    const { stdout } = await run("node", [CLI, dir, "--questions", qpath, "--evaluate", "--no-color"]);
    assert.match(stdout, /P@1/, "explicit --evaluate keeps the full metrics output");
    let leaked = false;
    try {
      await readFile(join(dir, "nocontext-topic-probes.json"));
      leaked = true;
    } catch {
      // expected: no topic file when real probes were supplied
    }
    assert.equal(leaked, false, "must not generate topic probes when --questions is supplied");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
