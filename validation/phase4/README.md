# Phase 4, scaled down: does the vocabulary effect replicate on real repos?

This is not the causal study originally scoped in `PLANNER.md`. That design
(preregistered, multi-condition, real agent runs, cost tracking) was cut after
a direct disagreement about scope: it turned "prove this matters" into a
multi-week research program before checking whether a smaller, faster test
was possible or whether public data could substitute for it. It couldn't —
[ContextBench](https://arxiv.org/abs/2602.05892) and
[Agent Retrieval Bench](https://arxiv.org/html/2607.24882v1) are public and
downloadable, but both measure code-context retrieval for bug-fixing, not
documentation-navigation routing for questions. No public dataset tests the
axis this tool measures. Checked directly before writing any of this, not
assumed.

What follows is smaller and more honest about its limits: does the effect
demonstrated on a hand-built fixture (`examples/`) and one pilot repo
(Backlog.md, `docs/pilot-2026-08-28.md`) replicate on three real, independently
selected repositories, using the tool exactly as documented?

## Method

For each of the three pinned repos already prepared in Phase 3
(`validation/phase3/README.md` — OpenAI Codex, NVIDIA NVCF, Vercel AI SDK, at
their pinned commits):

1. Ran `nocontext --evaluate` on the repo's **real, unedited** navigation
   surface against its held-out probe set. This is the true as-is baseline —
   captured via `git stash` on the pinned checkout, not assumed.
2. Ran `nocontext --diagnose` on the **development** probe set to get the
   tool's own source-grounded vocabulary suggestions — the intended workflow,
   not hand-authored prose.
3. Edited each repo's real navigation surface locally (never committed; these
   are third-party repos) using only the diagnose output and the development
   set, with the held-out set untouched.
4. Re-ran `--evaluate` on the same held-out probes against the revised
   surface, and used `--baseline` to compute the delta against step 1's
   captured JSON.

## Result

| repo | surface | lexical P@1 delta | semantic P@1 delta | fix type |
|---|---|---:|---:|---|
| OpenAI Codex | `README.md` | **0% → 83%** (+83 pts) | 67% → 83% (+17 pts) | vocabulary (install.md) + coverage (config.md was never linked) |
| NVIDIA NVCF | `docs/user/index.md` | **0% → 50%** (+50 pts) | 0% → 67% (+67 pts) | coverage — target docs were two navigation hops deep, never linked from the top-level index |
| Vercel AI SDK | `AGENTS.md` | **17% → 50%** (+33 pts) | 83% → 83% (+0 pts) | vocabulary only — surface already linked every target doc |

Every number above came from the tool's own `--baseline` output, not a manual
calculation. Raw JSON for all six runs (three as-is, three revised) is in
this directory.

## What this does and does not establish

**Does:** the vocabulary/coverage effect demonstrated on a fixture built to
show it (Claim A) replicates on three real repositories nobody selected or
wrote to prove a point, under both BM25 and a local embedding model. It is
not just a property of our own hand-built corpus.

**Does not:** prove Claim B. This measures routing under two retrievers, not
whether a real agent grounds more answers or explores less because of it.
That causal question is still open — see `PLANNER.md` §3 and the pilot's
finding that a real agent with free file access on a small corpus often
routes past a bad index anyway. NVCF and Vercel AI's corpora, scoped as
tested here, are small enough that the pilot's boundary condition likely
applies; whether the effect survives contact with a real agent on these
specific repos is untested.

**A contamination limitation specific to this run, stated plainly rather than
glossed over:** the same session that fact-checked all 36 probes — including
every held-out question, for all three repos — also authored these
rewrites. I did not consult held-out phrasing while writing the rewrites, and
built each one only from `--diagnose` output against the development set, but
I cannot claim the same blindness a genuinely separate party would have,
because I had already read the held-out questions earlier in this session
during the Phase 3 fact-check. A rewrite authored by someone (or some agent
session) who has never seen the held-out set at all would be needed to fully
rule out unconscious steering toward held-out phrasing. Treat this result as
suggestive and reproducible-in-shape, not as clean as a true blind study.

**Small samples.** Six held-out probes per repo. The tool's own output flags
this: "Fewer than 12 probes. The result is indicative at best." Consistent
direction across three repos is more informative than any one repo's number,
but this is not a large-N result.

**Probe review status unchanged.** These probes passed an agent-assisted fact
check (`validation/phase3/agent-review-2026-08-28.md`), not the independent
human blind review the Phase 3 protocol still requires. That gate remains
open.

**A methodological wrinkle worth flagging rather than hiding:** in Codex and
Vercel AI, the semantic **observed** score exceeds the semantic **full-text
reference** score. A short, curated navigation entry outscoring the entire
source document under embedding search is unexpected — plausibly the
chunking-and-mean-pooling in `src/retrievers/semantic.ts` dilutes long
documents in a way a concise, on-topic pointer entry doesn't suffer from, but
this is offered as a hypothesis, not a checked explanation. It means the
semantic "full-text reference" is not always a reliable ceiling, and any
future use of it should account for that rather than treat it as ground
truth.

## What would close the remaining gap

1. Independent human blind review of the 36 probes (Phase 3's open gate).
2. A rewrite authored by a party with no prior exposure to the held-out set,
   to remove the contamination caveat above.
3. Real agent runs (not just retriever scoring) on at least one of these
   repos, to test whether the routing improvement shown here actually changes
   what an agent does — this is the part that tests Claim B, and it's still
   the open question, just a much smaller one to attempt now that the routing
   effect itself has real-repo evidence behind it.
