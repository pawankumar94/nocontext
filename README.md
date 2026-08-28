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

```
$ nocontext examples/retrieval-index

  ungrounded rate       47%  (1 - P@1)

                        P@1     MRR     R@3     R@5
  floor (random)        17%     0.41    50%     83%
  observed (index)      53%     0.58    63%     63%
  ceiling (full text)   74%     0.82    89%     89%

  21 points of your own information is not reachable from your index.

  unreachable
    [ ] How long do we hold at 5% before going full?
        answer is in docs/deploy-policy.md
    [ ] Who has to stay online while a release is going out?
        answer is in docs/deploy-policy.md
    [ ] Can I swap a shift without asking anyone?
        answer is in docs/oncall.md
    [ ] Are traces backed up anywhere?
        answer is in docs/data-retention.md
    [ ] Why am I getting 429s?
        answer is in docs/rate-limits.md
    [ ] What happens if I keep retrying immediately?
        answer is in docs/rate-limits.md
    [ ] Does a degraded service page anyone at 3am?
        answer is in docs/incident-severity.md
    [ ] Can we downgrade an incident once it's open?
        answer is in docs/incident-severity.md
    and 1 more

  bm25@1.0.0 · 19 probes
```

That's the real output of a real, working command against one of the bundled
example corpora (`examples/retrieval-index/`) — not a mockup. See
[the honesty section](#how-honest-is-this-right-now) below for exactly what
this result does and doesn't prove yet.

## Why this and not another OKF/RAG tool

Every existing linter in this space — `okf-skills`, `okfcli`, Inkeep's
OpenKnowledge plugin, the rest — checks whether your docs are **valid**:
frontmatter present, links resolve, dates fresh. None of them check whether
your docs are **findable**. A corpus can pass every one of those checks and
still be invisible to the agent reading it.

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

That runs against one of the bundled example corpora — point it at your own
docs the same way, plus `--questions your-probes.json` (see
[Probe generation](docs/METHOD.md#where-probe-questions-come-from); until
Phase 3 ships, a questions file is required).

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

Yes, today, with plain keyword stuffing — and the tool says so about itself
rather than hiding it. Until a semantic retriever ships (tracked in
[Phase 3](PLANNER.md#phase-3--make-it-hard-to-fool)), scoring runs on BM25
alone, and BM25 rewards an index padded with query vocabulary regardless of
whether that vocabulary describes anything true.
[`examples/stuffed-index/`](examples/stuffed-index) is that adversarial corpus,
committed on day one specifically so this gap is visible and testable rather
than discovered later by someone else.

## What it works on

Any directory an agent reads: `AGENTS.md`, `CLAUDE.md`, a `docs/` folder, a
wiki, an OKF bundle, a folder of runbooks. No index file present means the
file tree is scored as the navigation surface, since that's genuinely what an
agent without an index has to work with — labelled as such in the output, and
not compared 1:1 against corpora that do have an index.

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
