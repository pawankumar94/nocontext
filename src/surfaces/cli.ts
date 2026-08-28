#!/usr/bin/env node
/** Terminal surface. Builds a source, calls analyze, formats. No measurement. */
import { readFile, writeFile } from "node:fs/promises";
import { analyze } from "../core/analyze.js";
import { loadDocs } from "../core/corpus/index.js";
import { fileSystemSource } from "../sources/filesystem.js";
import { renderText } from "../report/text.js";
import { renderJson } from "../report/json.js";
import { renderAssist } from "../report/assist.js";
import { generateTopicProbes } from "../core/probes/topic.js";
import { lexical } from "../core/retrievers/lexical.js";
import { semantic } from "../retrievers/semantic.js";
import { compareRuns } from "../core/comparison.js";
import type { Probe, Run } from "../core/types.js";

const USAGE = `
  nocontext <dir>                  find routing misses. no setup, no metrics.
  nocontext <dir> [options]        the full protocol, see below

  With no other flags, nocontext auto-detects a navigation surface,
  generates mechanical topic probes from your docs (no model, coverage only),
  and prints a miss list: what a question would hit, what it should hit, and
  which words to add. Nothing here is a score.

  --questions <file>   real or reviewed probes. Skips topic-probe generation.
  --surface <file>     navigation file to score (for example AGENTS.md)
  --include <path>     document file or directory to include; repeatable
  --baseline <file>    compare this evaluate run with a prior JSON run
  --diagnose           show source-grounded navigation edits from development probes
  --evaluate           score held-out probes without exposing edit suggestions
  --json               full run record
  --fail-under <pct>   exit 1 when lexical P@1 falls below this. Requires --evaluate.
  --no-color
`;

async function loadProbes(path: string): Promise<Probe[]> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!raw || typeof raw !== "object") throw new Error("expected a JSON object");
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record["probes"]) || !record["probes"].length) {
    throw new Error("probes must be a non-empty array");
  }
  const origin = record["origin"] ?? "supplied";
  if (origin !== "supplied" && origin !== "generated" && origin !== "fixture") {
    throw new Error(`invalid probe origin: ${String(origin)}`);
  }
  return record["probes"].map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`probe ${index + 1} must be an object`);
    const probe = value as Record<string, unknown>;
    if (typeof probe["question"] !== "string") {
      throw new Error(`probe ${index + 1} question must be a string`);
    }
    const expect = probe["expect"];
    if (typeof expect !== "string" &&
        !(Array.isArray(expect) && expect.length && expect.every((item) => typeof item === "string"))) {
      throw new Error(`probe ${index + 1} expect must be a document path or non-empty path array`);
    }
    return { question: probe["question"], expect, origin } as Probe;
  });
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const valueFlags = new Set(["--questions", "--surface", "--include", "--baseline", "--fail-under"]);
  const booleanFlags = new Set(["--diagnose", "--evaluate", "--json", "--no-color", "--help"]);
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (valueFlags.has(arg)) {
      if (!argv[i + 1] || argv[i + 1]!.startsWith("-")) {
        process.stderr.write(`  ${arg} requires a value\n\n`);
        return 2;
      }
      i += 1;
    } else if (arg.startsWith("-") && !booleanFlags.has(arg)) {
      process.stderr.write(`  unknown option: ${arg}\n\n`);
      return 2;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }
  const dir = positionals[0];
  if (positionals.length > 1) {
    process.stderr.write(`  expected one corpus directory, got: ${positionals.join(", ")}\n\n`);
    return 2;
  }
  if (!dir || argv.includes("--help")) {
    process.stdout.write(USAGE);
    return argv.includes("--help") ? 0 : 1;
  }
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const flags = (name: string) => argv.flatMap((arg, index) =>
    arg === name && argv[index + 1] ? [argv[index + 1]!] : []);

  const explicitQuestions = flag("--questions");
  if (argv.includes("--diagnose") && argv.includes("--evaluate")) {
    process.stderr.write("  choose either --diagnose or --evaluate, not both\n\n");
    return 2;
  }
  const explicitMode = argv.includes("--diagnose") || argv.includes("--evaluate");
  // Bare `nocontext <dir>`, no questions and no explicit mode: the zero-config
  // path. No metrics, no jargon, a miss list from mechanical topic probes.
  const assist = !explicitQuestions && !explicitMode;
  const mode = argv.includes("--diagnose") ? "diagnose" : "evaluate";

  if (!assist && mode === "diagnose" && flag("--fail-under")) {
    process.stderr.write(
      "  --fail-under only accepts held-out evaluation runs; remove --diagnose or use --evaluate\n\n",
    );
    return 2;
  }
  if (!assist && mode === "diagnose" && flag("--baseline")) {
    process.stderr.write("  --baseline only accepts held-out evaluation runs\n\n");
    return 2;
  }
  const failUnder = flag("--fail-under");
  const threshold = failUnder === undefined ? undefined : Number(failUnder);
  if (threshold !== undefined &&
      (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)) {
    process.stderr.write("  --fail-under must be a number from 0 to 100\n\n");
    return 2;
  }
  if (assist && threshold !== undefined) {
    process.stderr.write("  --fail-under requires --evaluate; a topic-probe run is never a score\n\n");
    return 2;
  }

  const source = fileSystemSource(dir, { surface: flag("--surface"), include: flags("--include") });

  let probes: Probe[];
  let generatedPath: string | undefined;
  if (assist) {
    // Topic probes never come from the surface, matching the same rule that
    // governs host-agent generation: testing a surface against a probe drawn
    // from that surface is circular.
    const docs = await loadDocs(source);
    probes = generateTopicProbes(docs);
    if (!probes.length) {
      process.stderr.write("  no headings found to generate topic probes from; pass --questions\n\n");
      return 1;
    }
    generatedPath = `${dir}/nocontext-topic-probes.json`;
    await writeFile(generatedPath, JSON.stringify({ origin: "topic", probes }, null, 2) + "\n", "utf8");
  } else {
    const questions = explicitQuestions ?? `${dir}/questions.json`;
    try {
      probes = await loadProbes(questions);
    } catch (error) {
      if (!explicitQuestions) {
        process.stderr.write(
          `  no probes found at ${questions}\n` +
          "  pass --questions with reviewed queries, or drop --diagnose/--evaluate for a zero-config miss list\n\n",
        );
        return 1;
      } else {
        process.stderr.write(
          `  could not read probes at ${questions}: ${
            error instanceof Error ? error.message : String(error)
          }\n\n`,
        );
        return 1;
      }
    }
  }

  const run = await analyze(source, {
    probes,
    mode: assist ? "diagnose" : mode,
    retrievers: [lexical, semantic],
  });

  let comparison;
  const baselinePath = flag("--baseline");
  if (baselinePath) {
    try {
      const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as Run;
      comparison = compareRuns(baseline, run);
    } catch (error) {
      process.stderr.write(
        `  could not read baseline at ${baselinePath}: ${
          error instanceof Error ? error.message : String(error)
        }\n\n`,
      );
      return 2;
    }
  }

  process.stdout.write(argv.includes("--json")
    ? renderJson(run, comparison) + "\n"
    : assist
      ? renderAssist(run, generatedPath!, !argv.includes("--no-color"))
      : renderText(run, !argv.includes("--no-color"), comparison));

  if (run.warnings.some((warning) => warning.kind === "invalid-probes")) return 2;
  if (comparison && !comparison.compatible) return 2;

  if (threshold !== undefined && run.lexical.observed.p1 < threshold / 100) return 1;
  return 0;
}

main().then((code) => process.exit(code), (err: unknown) => {
  process.stderr.write(`nocontext: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
