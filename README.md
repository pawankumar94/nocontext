<p align="center">
  <img src="docs/assets/logo.svg" width="72" alt="nocontext">
</p>

<h1 align="center">nocontext</h1>
<p align="center"><strong>A retrieval-quality linter for AGENTS.md, CLAUDE.md, and the docs your agents already read.</strong></p>

<p align="center">
  <a href="docs/METHOD.md"><img alt="method: published before results" src="https://img.shields.io/badge/method-published%20before%20results-E07B39"></a>
  <img alt="status: unvalidated, see below" src="https://img.shields.io/badge/status-unvalidated-9AA0A6">
  <img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-9AA0A6">
</p>

---

## The problem in one sentence

**Claude Code, Cursor, and Codex all read `AGENTS.md` / `CLAUDE.md` / your `docs/`
folder to decide what your project needs them to know — and every one of them
finds that context by something closer to keyword matching than reading
comprehension.**

You write your index the way you'd explain the project to a colleague:
*"what must be true before a production rollout."* Nobody searches in that
phrasing. They ask *"do migrations run before or after the deploy?"* — and if
those words don't overlap, the agent doesn't error. It just doesn't find your
doc, and answers from its own priors instead. Nothing logs that this happened.
The session looks completely normal.

`nocontext` finds those mismatches before your agent does.

```text
$ nocontext examples/retrieval-index --evaluate

  evaluate run · surface: index.md
  lexical  bm25@1.0.0
  top-1 routing miss    47%  (1 - P@1)
  observed (index)      53% P@1
  ceiling (full text)   74% P@1

  semantic  minilm-l6-v2@1.0.0+751bff3
  top-1 routing miss     5%  (1 - P@1)
  observed (index)      95% P@1
  ceiling (full text)   95% P@1
```

This is a shortened excerpt of the real output. The command also prints the
random floor, MRR, Recall@3, Recall@5, individual misses, warnings, and the
exact retriever versions.

That's the real output of a real, working command against one of the bundled
example corpora (`examples/retrieval-index/`) — not a mockup. See
[the honesty section](#how-honest-is-this-right-now) below for exactly what
this result does and doesn't prove yet.

## Why this and not another OKF/RAG tool

Instruction-file linters and repository-readiness tools check structure,
freshness, overlap, and task compliance. Some also run agents against harvested
tasks. `nocontext` stays narrower: it tests whether a real question routes
through a chosen documentation surface to the source that answers it, then
identifies vocabulary gaps that can be checked on held-out questions.

And unlike an OKF bundle, an MCP server, or a new knowledge format, `nocontext`
asks nothing of you. It reads the file your agent *already* reads —
`AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/` — and tells you where the
wording is going to lose it. No new format to adopt, no infrastructure to run.

## Install

```bash
git clone https://github.com/pawankumar94/nocontext && cd nocontext
npm ci && npm run build
node dist/surfaces/cli.js examples/retrieval-index
```

That runs against one of the bundled example corpora. On your own repository,
choose the navigation surface and provide reviewed probes:

```bash
node dist/surfaces/cli.js . --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions development.json --diagnose
node dist/surfaces/cli.js . --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions held-out.json --evaluate
```

Save the first evaluation with `--json`, then pass it back with
`--baseline before.json` after revising the surface. Incompatible runs are
rejected instead of producing a misleading delta.

The first semantic run downloads the pinned local MiniLM model. No API key is
required. Follow the [probe workflow](docs/PROBES.md) and read the
[measurement method](docs/METHOD.md#where-probe-questions-come-from) before
trusting a score.

Not yet on npm. `npx nocontext ./docs` is the target once it is.

## How honest is this right now

Say plainly what is and isn't proven, because a measurement tool that oversells
itself is worthless.

**Demonstrated:** on a hand-built corpus designed specifically to show the
effect, an index written in retrieval-friendly vocabulary scores meaningfully
higher than the same content indexed the way a person would summarise it —
same documents, same probes, only the wording of the index changed. That's the
mechanism, isolated. [`examples/`](examples/) is the controlled experiment and
you can rerun it yourself.

**Not yet demonstrated:** that a higher `nocontext` score causes an agent to
actually *succeed more often* on real tasks, in real repositories nobody built
to prove a point. That correlation is the entire justification for anyone
paying attention to this number, and it has not been run yet. It's
[Phase 4 in the planner](PLANNER.md#phase-4--prove-the-score-predicts-something-real),
and nothing here should be trusted as a product claim until it passes.

If you're the kind of person who wants to see a tool prove itself before
trusting it: that's the position we're in too. Watch that phase, not this
README.

## How it scores

Standard IR metrics — P@1, MRR, Recall@{1,3,5} — the same ones
[ContextBench](https://arxiv.org/abs/2602.05892) and
[Agent Retrieval Bench](https://arxiv.org/html/2607.24882v1) report, not a
scale invented for this project. See [`docs/METHOD.md`](docs/METHOD.md) for
why, and for where this sits relative to those two benchmarks — short version,
they fix the repository and vary the retriever; we fix the retriever and vary
the navigation surface, which neither of them measures.

Every run reports three conditions, never one number alone:

| | |
|---|---|
| **Floor** | a random ranking would score this. Shrinks as corpus size grows. |
| **Observed** | routing using only the index (or file tree, if there is none) |
| **Ceiling** | routing with full document bodies available, same retriever |

A bare percentage is unreadable without the corpus size behind it: 60% P@1 on
3 documents is barely above chance, on 200 it's remarkable. The gap between
observed and ceiling is the part an index rewrite can actually fix.

## Can I game it?

Yes. BM25 rewards copied query vocabulary, and the first embedding experiment
showed that semantic retrieval does not reliably expose the same attack. The
tool catches direct probe leakage, reports lexical and semantic results
separately, and keeps diagnosis apart from held-out evaluation. It does not
claim that these controls detect every optimized index.

[`examples/stuffed-index/`](examples/stuffed-index) is the committed adversary.
It copies probe questions into their expected entries and must trigger the
leakage warning without making the honest retrieval index fail.

## What it works on

Any Markdown corpus an agent reads: `AGENTS.md`, `CLAUDE.md`, a `docs/` folder,
a wiki export, an OKF bundle, or runbooks. Auto-detection prefers `AGENTS.md`,
then `CLAUDE.md`, `index.md`, and `README.md`; `--surface` makes the choice
explicit. Repeat `--include` to exclude unrelated monorepo Markdown from the
corpus. If no surface exists, the file tree is scored and labelled as an
implicit surface.

## Building on this

[`PLANNER.md`](PLANNER.md) has the full build plan: every phase, what evidence
each one has to produce, and the explicit criteria for passing or killing it.
[`AGENTS.md`](AGENTS.md) is the short version for coding agents joining this
repo. [`docs/METHOD.md`](docs/METHOD.md) is the methodology, written to be
attacked — read it before trusting any number this tool prints.

If you have a corpus where `nocontext` gives an obviously wrong answer, that's
the single most useful issue you could open. See
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
