# Provisional AI dry run: Phase 3 workflow

This is a workflow and implementation check, **not Phase 3 evidence**. The
candidate probes still require independent blind human review before they can
support a Phase 3 claim. Do not use this record to mark the review log as
complete or to start Phase 4.

## What was checked

Fresh disposable clones were checked out at the commits pinned in
[`README.md`](README.md):

| corpus | pinned commit | surface | included corpus |
|---|---|---|---|
| OpenAI Codex | `5ed294d49d64f79b25ae63cd1cdaf54db7a797fd` | `README.md` | `docs/` |
| NVIDIA NVCF | `6be3b8fe56d6faaf1823d195698944ae8df9a68e` | `docs/user/index.md` | `docs/user/` |
| Vercel AI SDK | `0a0f271cff061e1ca953ed9d14ed7d525613a4a9` | `AGENTS.md` | `contributing/`, `architecture/` |

All 36 candidate questions had an existing expected document. A body-only AI
pre-screen judged each question plausible and directly answerable by that
document without reading the selected navigation surface. That is not an
independent human review and is recorded only to make the limitation explicit.

The development probe runs worked with API-key environment variables unset and
loaded the pinned local semantic retriever alongside BM25.

## Temporary intervention

Only disposable checkouts were edited. Documents, probe files, selected surface
identity, retrievers, and inclusion scope stayed fixed.

- Codex: added a pointer to configuration/lifecycle hooks and expanded the
  existing installation pointer with source-faithful build, test, and logging
  vocabulary.
- NVCF: added pointers to function creation, unsupported registry allowlisting,
  and control-plane operations with vocabulary from the target documents.
- Vercel AI SDK: added explicit task-guide pointers for provider-response URL
  validation, test fixtures/manual tests, and release changesets.

The held-out baseline was written before those edits, with `--evaluate --json`
and without inspecting per-probe outcomes. Each after run used `--baseline`;
every comparison was compatible, so the tool confirmed that no document,
probe, retriever, extractor, or scope change contaminated the delta.

## Held-out observed P@1

| corpus | BM25 before → after | semantic before → after |
|---|---:|---:|
| OpenAI Codex | 0% → 50% | 67% → 67% |
| NVIDIA NVCF | 0% → 17% | 0% → 67% |
| Vercel AI SDK | 17% → 50% | 83% → 100% |

Each corpus had six held-out probes. These are directional results only: the
probe set is generated, the pre-screen was performed by an AI, and the sample
is below the tool's 12-probe low-confidence warning. They establish that the
Phase 3 workflow can produce a compatible, held-out delta on real corpora;
they do not establish that the delta is trustworthy enough to claim Phase 3
passed.

## Required next step

An independent human reviewer must use the blind-review procedure in
[`README.md`](README.md), fill the existing review log, and retain at least 20
accepted questions across the three corpora. Then repeat the intervention from
fresh clones using only accepted development questions and report the new
held-out comparisons.
