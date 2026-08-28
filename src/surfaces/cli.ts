#!/usr/bin/env node
/** Terminal surface. Builds a source, calls analyze, formats. No measurement. */
import { readFile } from "node:fs/promises";
import { analyze } from "../core/analyze.js";
import { fileSystemSource } from "../sources/filesystem.js";
import { renderText } from "../report/text.js";
import { renderJson } from "../report/json.js";
import { ungroundedRate, type Probe } from "../core/types.js";

const USAGE = `
  nocontext <dir> [options]

  --questions <file>   probes from your own query logs, which beat generated ones
  --json               full run record
  --fail-under <pct>   exit 1 when observed routing falls below this
  --no-color
`;

async function loadProbes(path: string): Promise<Probe[]> {
  const raw = JSON.parse(await readFile(path, "utf8")) as {
    origin?: Probe["origin"];
    probes: { question: string; expect: string }[];
  };
  const origin = raw.origin ?? "supplied";
  return raw.probes.map((p) => ({ ...p, origin }));
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith("-"));
  if (!dir || argv.includes("--help")) {
    process.stdout.write(USAGE);
    return dir ? 0 : 1;
  }
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };

  const questions = flag("--questions") ?? `${dir}/questions.json`;
  let probes: Probe[] = [];
  try {
    probes = await loadProbes(questions);
  } catch {
    process.stderr.write(
      `  no probes found at ${questions}\n` +
      `  probe generation lands in phase 3; until then pass --questions\n\n`,
    );
    return 1;
  }

  const run = await analyze(fileSystemSource(dir), { probes });

  process.stdout.write(argv.includes("--json")
    ? renderJson(run) + "\n"
    : renderText(run, !argv.includes("--no-color")));

  const failUnder = flag("--fail-under");
  if (failUnder && run.lexical.observed < Number(failUnder) / 100) return 1;
  void ungroundedRate;
  return 0;
}

main().then((code) => process.exit(code), (err: unknown) => {
  process.stderr.write(`nocontext: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
