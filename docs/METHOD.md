# Method

This document exists to be attacked. If you can break the methodology described
here, the number this tool prints is worthless, and I would rather find that out
from you than from a thread.

Everything below is implemented in `src/` and reproducible on any corpus,
including your own.

## Where this sits relative to existing benchmarks

Two recent benchmarks measure retrieval in coding agents and are worth reading
before this one: [ContextBench](https://arxiv.org/abs/2602.05892) (1,136
issue-resolution tasks, 66 repositories, human-annotated gold contexts) and
[Agent Retrieval Bench](https://arxiv.org/html/2607.24882v1) (427 samples
across four task types). Both hold the **repository fixed and vary the
retriever or agent**. Their headline findings: "sophisticated agent scaffolding
yields only marginal gains in context retrieval" (ContextBench), and
interactive agents still miss gold context on 27 to 35 percent of samples even
with exploration (ARB). Best reported sample-weighted MRR in ARB is 0.24.

This tool does the opposite: it **holds the retriever fixed and varies the
navigation surface**. Neither benchmark claims to measure whether documentation
structure affects retrieval; ARB says so explicitly. That is the axis this
tool measures, and the two are complementary rather than competing.

We report the same metrics those benchmarks use, MRR and Recall@k, rather than
an invented scale, so a result here means something to someone who has read
either paper.

**A related null result, addressed directly rather than ignored.** A
preregistered ablation studied [progressive disclosure in LLM-maintained wikis]
(https://arxiv.org/pdf/2607.04576) and found minimal to no measurable impact
from nested versus flat structure. If this tool's claim were "hierarchy helps",
that null result would be a serious problem for it. It is not the claim. The
finding here is about **vocabulary**, not structure: an index that describes a
concept in the words a person would summarise it routes worse than one that
describes it in the words a person would search for, independent of whether
either is nested. The two are different variables and a corpus can hold one
constant while varying the other. We have not tested whether they interact,
and that is an open question rather than a settled one.

## The question

An agent is pointed at a directory of documentation. A user asks a question the
documentation can answer.

**Does the agent reach the right document?**

Not "is the Markdown valid", not "is the frontmatter complete", not "is the
content correct". Those are answered by existing linters and they are all
orthogonal to this. A corpus can be perfectly formed, entirely accurate, and
still unreachable.

When the retriever does not reach it, an agent must either spend more effort
exploring or risk answering from prior knowledge without the source. This tool
measures the routing failure. Phase 4 tests when that failure changes real agent
grounding or exploration cost.

## What gets measured

For a corpus of N documents and a set of probe questions, we report P@1
(precision at rank 1), MRR (mean reciprocal rank), and Recall@{1,3,5}, using
only what the agent sees before it opens anything: the index, or in its
absence, the file tree.

Recall@k matters because agents typically open more than one candidate.
Scoring only the top hit understates what an index enables and understates
what one fails to.

We call the inverse of P@1 the **top-1 routing miss rate**. It is a retriever
metric, not a claim that a real agent failed to ground its answer.

## Three numbers, never one

A bare percentage is meaningless without knowing what the corpus makes possible.
Every run reports:

| | |
|---|---|
| **Floor** | random selection, `1/N`. What the score would be with no information at all. |
| **Observed** | index-only routing. |
| **Ceiling** | routing with full document bodies available, under the same retriever. |

The product is the **gap between observed and ceiling**. That is the portion of
your corpus's own information that your navigation surface is failing to expose.

This matters because it self-normalises. A 60% score on a 3-document corpus is
bad (floor is 33%). A 60% score on a 200-document corpus is remarkable (floor is
0.5%). Reporting 60% alone tells you nothing, and any tool that does is selling
you a number rather than a finding.

Where the ceiling is itself low, the problem is not navigation. The corpus does
not contain the answer, and this tool will say so rather than blaming the index.

**The ceiling is retriever-limited, not absolute.** It is what this retriever
manages with the whole document in front of it, which is not the same as what a
reasoning model would manage. On the bundled example corpus BM25 reaches 74%
with full text, so a quarter of the probes are not answerable by lexical
matching at all, whatever the index says. An earlier draft of this document
called the ceiling "what perfect navigation would achieve". That was wrong and
this is the correction: it is an upper bound under one scorer, and the honest
reading of the gap is "how much of what this retriever could find is hidden by
the index", not "how much of the truth is unreachable".

## Where probe questions come from

This is the most attackable part of the design, so it is the most constrained.

**Probes are never generated from the index.** Generating questions from the
navigation surface and then testing whether that surface retrieves them is
circular, and would produce a flattering number on any corpus. Probes are
generated from **document bodies only**, with the index excluded from context,
phrased as a user would actually ask rather than as the document phrases itself.

Three sources, reported separately and never blended:

1. **`--questions <file>`** — real queries from your logs. The gold standard. If
   you have them, nothing here is a substitute.
2. **Generated** — written by a capable host agent from bodies with the index
   withheld, then reviewed before use. The CLI does not generate template
   questions when none are supplied because weak probes create trustworthy
   looking but meaningless scores.
3. **Fixtures** — hand-written sets shipped in `examples/`, for regression
   testing the tool itself.

Every scored probe set is a file you can inspect, dispute, and replace.

Probe sets used to diagnose and rewrite navigation are development data. They
must not also be the only evidence that the rewrite worked. `--diagnose` emits
source-grounded edit candidates and rejects CI thresholds. The default
`--evaluate` mode suppresses edit candidates so a separate held-out set can be
used for the before-and-after score.

## Two retrievers, deliberately

Routing is scored under both a lexical retriever (BM25) and an embedding
retriever. We report both and never average them.

The two retrievers expose different failure modes. A lexical miss with a
semantic hit points to a vocabulary mismatch. A miss under both points to a
shared navigation gap. Their scores remain separate because averaging them
would hide that diagnosis.

The first pinned embedding run invalidated an earlier anti-gaming assumption.
The honest retrieval index and the probe-stuffed index both reached 95% semantic
P@1. Semantic divergence is therefore not a stuffing detector. Direct probe
leakage is detected instead by checking for near-contiguous question text in
the expected navigation entry. This catches the bundled adversary, but it is
not presented as a general detector for every form of metric optimization.

## Corpora with no index

Most documentation directories have no index at all. Scoring them as a 100%
routing miss would be technically defensible, dramatic, and dishonest, because
agents navigate file trees perfectly well.

Where no index exists, the **file tree is treated as the index**: paths and
filenames, which is genuinely what the agent sees. Corpora scored this way are
labelled `implicit index` in output, because the comparison to a corpus with a
real index is not like-for-like.

## Choosing the corpus and surface

The CLI auto-detects `AGENTS.md`, `CLAUDE.md`, `index.md`, then `README.md`.
Use `--surface` when the repository contains more than one plausible navigation
file. Every run reports the exact file it scored.

Large repositories also contain changelogs, generated Markdown, package notes,
and subtree instructions that a root surface may not be responsible for. Use
repeatable `--include` paths to state the intended document corpus. The output
reports how many included documents have an entry in the selected surface and
warns when fewer than half are described.

References are matched by normalized in-corpus paths. Fenced code examples do
not create navigation entries, duplicate basenames do not alias each other, and
broken or out-of-corpus symlinks are not read.

## What this does not measure

- **Answer quality.** Reaching the right document is necessary, not sufficient.
  A correctly routed question can still be answered badly.
- **Content accuracy.** A confidently wrong document scores the same as a
  correct one.
- **Real agent behaviour.** Retrievers are stand-ins. A model reading an index
  reasons about it and will outperform BM25 on both a good and a bad index.
  That is why the tool reports the *gap* rather than claiming to predict what
  your agent will do.
- **Anything about a single document in isolation.** This is a corpus-level
  measurement.

## Known attacks on this methodology

**"Your lexical retriever is a strawman."**
Correct, and it is why the embedding score is reported beside it. The lexical
number is a floor on retrieval difficulty, not a prediction. Both indexes under
comparison face the same scorer, so the delta survives even where the absolute
value does not.

**"You generated the questions, so you chose the outcome."**
The CLI requires a reviewed probe file. Host-agent generation must withhold the
index, preserve the resulting file, and keep evaluation probes separate from
the questions used to revise navigation. Bring your own queries and rerun.

**"N is too small to mean anything."**
Runs below a minimum probe count are labelled low-confidence in output. Small
corpora are noisy no matter what we do.

**"This just rewards keyword stuffing."**
It can. Direct copies of evaluation questions are rejected, but no automatic
rule proves an index was not optimized against a known probe set. The held-out
workflow is the primary defense, and the limitation is explicit.

**"You are measuring a problem you invented."**
The problem is documented independently: multi-step agent workflows fail
silently while appearing to function, and errors that never throw never appear
in any log. This tool puts a number on one specific, mechanical instance of
that.

## Reproducing and disputing

```bash
nocontext . --surface AGENTS.md --questions development.json --diagnose
nocontext . --surface AGENTS.md --questions held-out.json --evaluate
nocontext . --surface AGENTS.md --questions held-out.json --evaluate --json
```

Every run emits its probe set, retriever versions, floor, ceiling, and per-probe
outcomes. A disagreement about a score should be resolvable by exchanging that
file.

If you find a corpus where this tool gives an obviously wrong answer, open an
issue with the corpus attached. That is the most useful contribution anyone can
make to this project, and the benchmark will be corrected in public.
