# Phase 4b: does the routing fix change what a capped agent does?

Frozen protocol, decided before any run: **hard cap of 3 Read calls per
question** (the alternative — "top 3 files the retriever returns" — needed
retriever output wired into agent tool permissions, which is more moving
parts for the same test; the flat cap is simpler to enforce and reproduce, so
it's the one frozen). One fresh subagent per (repo, surface condition), zero
shared context with this conversation or with each other, given the real
navigation surface as its starting point (as any agent landing in the repo
would have) and the same 6 held-out probes from Phase 4a. Grading below is
mine, against the facts already established during Phase 3's review, not the
subagent's self-report.

No repo, question, or grading criterion changed after seeing a result. This
table is published as it came out, including the null.

## Result

| repo | surface | first-file = gold | grounded in gold | confidently **wrong** |
|---|---|---:|---:|---:|
| Codex | as-is | 6/6 | 6/6 | 0/6 |
| Codex | rewritten | 6/6 | 6/6 | 0/6 |
| NVCF | as-is | 0/6 | 0/6 | 2/6 |
| NVCF | rewritten | 5/6* | 6/6 | 0/6 |
| Vercel AI | as-is | 6/6 | 6/6 | 0/6 |
| Vercel AI | rewritten | 6/6 | 6/6 | 0/6 |

\* Q3 opened `api.md` first, then `function-creation.md` (the gold document)
within budget, and grounded correctly. Counted separately from "grounded"
because "first file" and "eventually grounded" are different claims and this
is the one case where they diverge.

**Aggregate grounded, 18 questions per condition: as-is 12/18 (67%),
rewritten 18/18 (100%).**

That aggregate is almost entirely one repo. Codex and Vercel AI: **zero
movement** — 6/6 grounded on both the as-is and the rewritten surface, for
both repos, matching Phase 3a's pilot finding exactly: a capped agent still
reasons past a terse or vocabulary-mismatched entry when the document is
*linked somewhere* and the corpus is small enough to make a good guess cheap.
NVCF: **0/18 to 18/18** — the full swing, and it is the repo where the gap
was pure coverage (the three target documents were never linked from any
navigation file at all, not badly described).

**Two of NVCF's as-is misses were not just wrong-file, they were confidently
wrong.** Reading `third-party-registries.md` (an adjacent but different
document) instead of `registry-allowlist.md`, the agent answered "yes" to
both "does allowlisting trigger existence checks" and "can Helm-chart
functions use a custom allowlist" — the real document says no to both. That
is not a missed answer. That is a wrong answer delivered with the same
confidence as a correct one, from reading the wrong source. It is the
concrete instance of the failure mode this whole project exists to catch.

## What this establishes, and what it doesn't

**Does not support:** "fix your navigation surface and your agent will stop
guessing" as a general claim. Two of three repos showed no effect at all
under this cap. Free, unconstrained exploration (this session's earlier
pilot) showed even less effect on a small corpus.

**Does support, narrowly:** when the gap is a document that is **not linked
anywhere** in the navigation surface — not badly worded, genuinely absent —
and the agent is working under a real constraint (here, a hard call budget;
in production, a ranked retrieval step, a tool-call ceiling, or a latency
budget would create the same pressure), fixing that coverage gap took
grounding from 0% to 100% on real held-out questions, on a real repository,
with two of the six original misses being confidently wrong rather than
merely absent.

**Does not distinguish, yet:** whether vocabulary-only fixes (Codex,
Vercel AI's actual edits) would matter under a *different* constrained
condition — a real vector-search step or an MCP resource picker, rather
than an agent's own judgment about which file to open. This test used an
agent's own file-opening decisions under a call budget, not a ranked
retrieval mechanism. That is a different, not-yet-run condition, named here
so it isn't quietly claimed.

## Raw transcripts

Six subagent runs, one per row above. Full question-by-question output
(first file, all files opened, verbatim answer) is in `raw-runs.md` in this
directory, copied directly from each agent's response, unedited.
