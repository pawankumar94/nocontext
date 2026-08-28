/**
 * The one entry point.
 *
 * Every surface calls this and nothing else: the CLI, the GitHub Action, the
 * MCP server, the library, whatever comes after. If a surface ever needs to
 * reassemble the pipeline itself, that is a bug in this signature rather than
 * a reason to duplicate it.
 *
 * It returns data and never prints, never exits, never throws for control flow.
 * Formatting is a surface concern and lives in ../report.
 */
import type { AnalyzeOptions, CorpusSource, Run } from "./types.js";

export declare function analyze(
  source: CorpusSource,
  options?: AnalyzeOptions,
): Promise<Run>;
