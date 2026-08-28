<p align="center">
  <img src="docs/assets/logo.svg" width="96" alt="nocontext">
</p>

<h1 align="center">nocontext</h1>

<p align="center">
  <em>Your agent will answer these questions with nothing behind it.<br>
  This tells you how many.</em>
</p>

---

Your docs lint clean. Your frontmatter is complete. Your wiki is valid.

None of that tells you whether an agent pointed at that folder can actually
**reach** the right document when someone asks a question. When it can't, it
does not error. It answers anyway, from memory, with no source behind it, and
nothing in any log records that it happened.

```
$ npx nocontext ./docs

  ungrounded rate        43%

  floor (random)          8%     ← 12 documents
  observed (index)       57%
  ceiling (full text)    92%     ← the answers are in your corpus

  35 points of your own information is not reachable from your index.
```

That gap is the finding. The corpus knows the answer. The navigation surface
does not expose it.

## Install

```bash
npx nocontext ./docs
```

No install, no config, no API key for the default run.

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

`examples/stuffed/` is a corpus built specifically to cheat. If a change to this
tool ever lets it pass clean, the change is wrong.

## Method

[`docs/METHOD.md`](docs/METHOD.md) is written to be attacked, and it is worth
reading before you trust a number from this. It covers where probe questions
come from and why they are never generated from the index, what the tool does
not measure, and the five strongest objections to the methodology with honest
answers.

If you find a corpus where `nocontext` is obviously wrong, open an issue with
the corpus attached. That is the most useful thing anyone can contribute, and
corrections get made in public.

## Status

Early. The method is settled and the implementation is being built against it.

## License

MIT
