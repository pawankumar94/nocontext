<p align="center">
  <img src="docs/assets/logo.svg" width="76" alt="nocontext">
</p>

<h1 align="center">nocontext</h1>

<p align="center">
  <em>Your agent will answer these questions with nothing behind it.<br>
  This tells you how many.</em>
</p>

<p align="center">
  <a href="docs/METHOD.md"><img alt="method: published first" src="https://img.shields.io/badge/method-published%20before%20results-E07B39"></a>
  <img alt="status: pre-alpha" src="https://img.shields.io/badge/status-pre--alpha-9AA0A6">
  <img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-9AA0A6">
</p>

> **Pre-alpha. The CLI does not run yet.**
> The methodology is settled and published, the example corpora are built, and
> the implementation is being written against both. The output below is the
> shape of the finished tool, not a recording of a real run. Nothing here
> reports a number yet, deliberately: `docs/METHOD.md` went in first so that
> the method could not be shaped to fit a result.

---

Your docs lint clean. Your frontmatter is complete. Your wiki is valid.

None of that tells you whether an agent pointed at that folder can actually
**reach** the right document when someone asks a question. When it can't, it
does not error. It answers anyway, from memory, with no source behind it, and
nothing in any log records that it happened.

```
$ npx nocontext ./docs          # intended output, not yet runnable

  ungrounded rate        43%

  floor (random)          8%     ← 12 documents
  observed (index)       57%
  ceiling (full text)    92%     ← the answers are in your corpus

  35 points of your own information is not reachable from your index.
```

That gap is the finding. The corpus knows the answer. The navigation surface
does not expose it.

Ungrounded results are marked `[ ]` in output, which is also the mark: a
citation with nothing behind it.

## Install

Not published yet. When it is:

```bash
npx nocontext ./docs
```

No install, no config, no API key for the default run.

To follow along now, clone it and run the tests:

```bash
git clone https://github.com/pawankumar94/nocontext && cd nocontext
npm ci && npm test
```

## Why three numbers

A single percentage is unreadable without knowing the size of the corpus. 60% is
poor across 3 documents, where random guessing gets you 33%. Across 200
documents it is extraordinary. Any tool that shows you one number is selling
you a figure rather than a measurement.

| | |
|---|---|
| **Floor** | random selection, `1/N` |
| **Observed** | routing using only the index or file tree |
| **Ceiling** | routing with full document bodies available |

The distance between observed and ceiling is the part you can actually fix, and
it is usually the index. Where the ceiling is also low, the answer is not in
your docs at all, and `nocontext` will say so rather than blaming your index.

## What it works on

Any directory an agent reads. `docs/`, a wiki, `CLAUDE.md` and `AGENTS.md`,
an OKF bundle, a folder of runbooks. If the corpus has no index, the file tree
is scored as the index, because that is genuinely what the agent navigates.

## Can I game it?

Yes, and the obvious way is to stuff your index with keywords.

So routing is scored under a lexical retriever and an embedding retriever, and
the two are reported separately and never averaged. **A stuffed index scores
high lexically and flat semantically.** That divergence is reported as a
warning, not as a good score.

`examples/stuffed-index/` is a corpus built specifically to cheat. If a change to this
tool ever lets it pass clean, the change is wrong.

## The examples are a controlled experiment

`examples/` holds four corpora with **byte-identical documents and byte-identical
probes**. The only thing that varies is the navigation surface, so any
difference in score between them is caused by the index and nothing else.

| variant | surface | what it is |
|---|---|---|
| `human-index` | `index.md` | reads well to a person, routes badly |
| `retrieval-index` | `index.md` | same docs, indexed in the words people ask in |
| `stuffed-index` | `index.md` | gamed: probe vocabulary dumped in, describes nothing |
| `no-index` | file tree | no index, the implicit-surface path |

They are generated from one source rather than maintained by hand, because
hand-maintained copies drift and drift would void the control without anything
appearing to break. CI regenerates them and fails if the committed tree has
moved.

The probes were hand-written before any index existed, phrased the way someone
asks rather than the way the documents phrase themselves, so no variant is
favoured.

A prediction, recorded before the scorer exists: **all four must report the same
ceiling**, since the documents are identical. If they do not, the implementation
has a bug and this is how we find out.

## Building on this

[`PLANNER.md`](PLANNER.md) is the working plan: what is being built, in what
order, what each phase has to prove before the next begins, and the open
questions that are genuinely still open. [`AGENTS.md`](AGENTS.md) is the short
version for coding agents.

## Method

[`docs/METHOD.md`](docs/METHOD.md) is written to be attacked, and it is worth
reading before you trust a number from this. It covers where probe questions
come from and why they are never generated from the index, what the tool does
not measure, and the five strongest objections to the methodology with honest
answers.

If you find a corpus where `nocontext` is obviously wrong, open an issue with
the corpus attached. That is the most useful thing anyone can contribute, and
corrections get made in public.

## License

MIT
