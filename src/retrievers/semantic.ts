/**
 * Local embedding retrieval. No API key and no document content leaves the
 * machine.
 *
 * `@huggingface/transformers` is a peer dependency, not a hard one: its
 * current release pulls onnxruntime-node and sharp versions with real,
 * published advisories (an adm-zip DoS via onnxruntime-node, and libvips
 * CVEs via sharp — see CONTRIBUTING.md). This package's own `overrides` patch
 * those for local development, but npm does not propagate a dependency's
 * overrides to whoever installs it, so a bare `npm install nocontext` must
 * not pull that subtree in by default.
 *
 * The import is dynamic so the base install stays clean. `optional: true` on
 * the exported retriever means analyze() degrades to lexical-only with a
 * clear warning if the peer dependency is absent, instead of crashing the CLI.
 */
import type { Retriever } from "../core/types.js";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- type-only, loaded dynamically at runtime
type TransformersModule = typeof import("@huggingface/transformers");
type FeatureExtractionPipeline = import("@huggingface/transformers").FeatureExtractionPipeline;

export const SEMANTIC_MODEL = "Xenova/all-MiniLM-L6-v2";
export const SEMANTIC_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
export const SEMANTIC_PACKAGE = "@huggingface/transformers";

const WORDS_PER_CHUNK = 180;
const OVERLAP_WORDS = 30;
const EMBED_BATCH_SIZE = 32;

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

async function loadTransformers(): Promise<TransformersModule> {
  try {
    return (await import(SEMANTIC_PACKAGE)) as TransformersModule;
  } catch (error) {
    throw new Error(
      `semantic scoring needs the optional peer dependency "${SEMANTIC_PACKAGE}", ` +
      `which is not installed. Run: npm install ${SEMANTIC_PACKAGE}. ` +
      "This dependency currently carries known transitive advisories (see " +
      "CONTRIBUTING.md); installing it is a deliberate opt-in, not a default.",
      { cause: error },
    );
  }
}

async function extractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= loadTransformers().then((transformers) =>
    transformers.pipeline("feature-extraction", SEMANTIC_MODEL, {
      dtype: "int8",
      revision: SEMANTIC_REVISION,
    }),
  );
  return extractorPromise;
}

function chunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= WORDS_PER_CHUNK) return [text];
  const out: string[] = [];
  const step = WORDS_PER_CHUNK - OVERLAP_WORDS;
  for (let start = 0; start < words.length; start += step) {
    out.push(words.slice(start, start + WORDS_PER_CHUNK).join(" "));
    if (start + WORDS_PER_CHUNK >= words.length) break;
  }
  return out;
}

async function embed(texts: string[]): Promise<number[][]> {
  const model = await extractor();
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);
    const tensor = await model(batch, { pooling: "mean", normalize: true });
    vectors.push(...(tensor.tolist() as number[][]));
  }
  return vectors;
}

function dot(a: number[], b: number[]): number {
  let score = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) score += a[i]! * b[i]!;
  return score;
}

async function rankMany(
  queries: string[],
  candidates: { docId: string; text: string }[],
): Promise<string[][]> {
  if (!queries.length) return [];
  const candidatesWithEvidence = candidates.filter((candidate) => candidate.text.trim());
  if (!candidatesWithEvidence.length) return queries.map(() => []);
  const passages = candidatesWithEvidence.flatMap((candidate) =>
    chunks(candidate.text).map((text) => ({ docId: candidate.docId, text })),
  );
  const vectors = await embed([...queries, ...passages.map((passage) => passage.text)]);
  const queryVectors = vectors.slice(0, queries.length);
  const passageVectors = vectors.slice(queries.length);

  return queryVectors.map((queryVector) => candidatesWithEvidence
    .map((candidate) => {
      let score = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < passages.length; i += 1) {
        if (passages[i]!.docId === candidate.docId) {
          score = Math.max(score, dot(queryVector!, passageVectors[i]!));
        }
      }
      return { docId: candidate.docId, score };
    })
    .sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId))
    .map(({ docId }) => docId));
}

export const semantic: Retriever = {
  name: "minilm-l6-v2",
  family: "semantic",
  version: `1.0.0+${SEMANTIC_REVISION.slice(0, 7)}`,
  optional: true,
  rankMany,
  async rank(query, candidates) {
    return (await rankMany([query], candidates))[0] ?? [];
  },
};
