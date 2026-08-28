import type { Measurement, Run } from "./types.js";

export interface MetricDelta {
  p1: number;
  mrr: number;
  recall: { at1: number; at3: number; at5: number };
}

export interface RunComparison {
  compatible: boolean;
  errors: string[];
  lexical?: MetricDelta;
  semantic?: MetricDelta;
}

function same(valueA: unknown, valueB: unknown): boolean {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

function delta(before: Measurement, after: Measurement): MetricDelta {
  return {
    p1: after.observed.p1 - before.observed.p1,
    mrr: after.observed.mrr - before.observed.mrr,
    recall: {
      at1: after.observed.recall.at1 - before.observed.recall.at1,
      at3: after.observed.recall.at3 - before.observed.recall.at3,
      at5: after.observed.recall.at5 - before.observed.recall.at5,
    },
  };
}

export function compareRuns(before: Run, after: Run): RunComparison {
  const errors: string[] = [];
  if (before.mode !== "evaluate" || after.mode !== "evaluate") {
    errors.push("baseline comparison requires two evaluate runs");
  }
  if (before.corpus.docs !== after.corpus.docs) errors.push("document counts differ");
  if (!before.corpus.fingerprint || before.corpus.fingerprint !== after.corpus.fingerprint) {
    errors.push("document contents differ");
  }
  if (before.surface !== after.surface || before.surfaceSource !== after.surfaceSource) {
    errors.push("navigation surface identity differs");
  }
  if (before.surfaceExtractor !== after.surfaceExtractor) {
    errors.push("surface extractor versions differ");
  }
  const beforeProbes = before.lexical.outcomes.map((outcome) => outcome.probe);
  const afterProbes = after.lexical.outcomes.map((outcome) => outcome.probe);
  if (!same(beforeProbes, afterProbes)) errors.push("probe sets or ordering differ");
  if (before.lexical.retriever !== after.lexical.retriever) {
    errors.push("lexical retriever versions differ");
  }
  if (!same(before.lexical.floor, after.lexical.floor)) errors.push("lexical floors differ");
  if (!same(before.lexical.ceiling, after.lexical.ceiling)) {
    errors.push("lexical ceilings differ; documents or answerability changed");
  }
  if (Boolean(before.semantic) !== Boolean(after.semantic)) {
    errors.push("semantic results are present in only one run");
  } else if (before.semantic && after.semantic) {
    if (before.semantic.retriever !== after.semantic.retriever) {
      errors.push("semantic retriever versions differ");
    }
    if (!same(before.semantic.floor, after.semantic.floor)) errors.push("semantic floors differ");
    if (!same(before.semantic.ceiling, after.semantic.ceiling)) {
      errors.push("semantic ceilings differ; documents or answerability changed");
    }
  }
  if (errors.length) return { compatible: false, errors };
  return {
    compatible: true,
    errors: [],
    lexical: delta(before.lexical, after.lexical),
    semantic: before.semantic && after.semantic ? delta(before.semantic, after.semantic) : undefined,
  };
}
