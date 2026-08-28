# Method

This document exists to be attacked. If you can break the methodology described
here, the number this tool prints is worthless, and I would rather find that out
from you than from a thread.

Everything below is implemented in `src/` and reproducible on any corpus,
including your own.

## The question

An agent is pointed at a directory of documentation. A user asks a question the
documentation can answer.

**Does the agent reach the right document?**

Not "is the Markdown valid", not "is the frontmatter complete", not "is the
content correct". Those are answered by existing linters and they are all
orthogonal to this. A corpus can be perfectly formed, entirely accurate, and
still unreachable.

When the agent does not reach it, the observable outcome is that the agent
answers anyway, from parametric memory, with no source behind it. That is the
failure this measures.

## What gets measured

For a corpus of N documents and a set of probe questions, we report the fraction
of probes that route to the correct document using only what the agent sees
before it opens anything: the index, or in its absence, the file tree.

We call the inverse the **ungrounded rate**: the share of answerable questions
where the agent would have to answer without reaching its source.

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
2. **Generated** — model-written from bodies, index withheld. The default,
   because most people have no query logs.
3. **Fixtures** — hand-written sets shipped in `examples/`, for regression
   testing the tool itself.

Generated probes are written to disk on every run. If you think the questions
are unfair, you can read them, and you can replace them.

## Two retrievers, deliberately

Routing is scored under both a lexical retriever (BM25) and an embedding
retriever. We report both and never average them.

This is the answer to the obvious gaming strategy. Once a tool rewards indexes
that contain query vocabulary, the way to score well is to stuff the index with
keywords.

**A stuffed index scores high lexically and flat semantically.** That divergence
is not noise, it is the signal that someone optimised for the metric rather than
for their readers. A large positive gap between the two scores is reported as a
warning, not as a good result.

How badly this is needed is measurable. On the bundled corpora the stuffed index
scores **79%** against an honest index's 53%, and beats even the 74% full-text
ceiling. Padding an index with query vocabulary currently outperforms reading
the entire document. Until the semantic retriever ships, this tool can be gamed
completely, and it says so in its own output rather than quietly reporting the
inflated number as a good score.

`examples/stuffed/` is a corpus built specifically to game the lexical score. If
a change to this tool ever lets that corpus pass clean, the change is wrong.

## Corpora with no index

Most documentation directories have no index at all. Scoring them as 100%
ungrounded would be technically defensible, dramatic, and dishonest, because
agents navigate file trees perfectly well.

Where no index exists, the **file tree is treated as the index**: paths and
filenames, which is genuinely what the agent sees. Corpora scored this way are
labelled `implicit index` in output, because the comparison to a corpus with a
real index is not like-for-like.

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
Probes are written to disk, the generation prompt is in `probes/`, and
`--questions` overrides everything. Bring your own and rerun.

**"N is too small to mean anything."**
Runs below a minimum probe count are labelled low-confidence in output. Default
is 5 probes per document, and small corpora are noisy no matter what we do.

**"This just rewards keyword stuffing."**
See the dual-retriever section. It is the main thing the design defends against.

**"You are measuring a problem you invented."**
The problem is documented independently: multi-step agent workflows fail
silently while appearing to function, and errors that never throw never appear
in any log. This tool puts a number on one specific, mechanical instance of
that.

## Reproducing and disputing

```bash
npx nocontext ./docs --emit-probes probes.json   # see the questions
npx nocontext ./docs --questions mine.json       # bring your own
npx nocontext ./docs --json                      # full run record
```

Every run emits its probe set, retriever versions, floor, ceiling, and per-probe
outcomes. A disagreement about a score should be resolvable by exchanging that
file.

If you find a corpus where this tool gives an obviously wrong answer, open an
issue with the corpus attached. That is the most useful contribution anyone can
make to this project, and the benchmark will be corrected in public.
