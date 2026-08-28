---
name: nocontext
description: Measure whether your AGENTS.md, CLAUDE.md, or docs index actually routes real questions to the right file. Use when someone asks to check, audit, lint, or improve how findable their instruction files or documentation are for an agent, or asks why an agent isn't using a doc that already answers something.
allowed-tools: Bash, Read
---

# nocontext

`nocontext` measures whether a navigation surface (`AGENTS.md`, `CLAUDE.md`,
`README.md`, or a docs index) routes a real question to the document that
answers it. It reports standard retrieval metrics (P@1, MRR, Recall@k), never
a single number, and it does **not** claim that a better score makes an agent
smarter — that causal question is open and explicitly unproven; see
`docs/METHOD.md` in the [nocontext repo](https://github.com/pawankumar94/nocontext)
if asked about it. Treat every score as a routing diagnostic, not a
validated predictor of agent behavior.

## When to use this

- Someone asks to check, audit, or improve how well their `AGENTS.md` /
  `CLAUDE.md` / docs actually route questions.
- Someone asks why an agent didn't use a document that clearly answers a
  question that was asked.
- Someone wants to compare a navigation surface before and after an edit.

Do not reach for this to judge whether documentation is *accurate* or
*complete* — it only measures whether a real question routes to the right
file. A document can be perfectly correct and still score badly if its
navigation entry doesn't share vocabulary with how people actually ask.

## Prerequisites

Requires a local clone of `nocontext`, built once:

```bash
git clone https://github.com/pawankumar94/nocontext /tmp/nocontext
cd /tmp/nocontext && npm ci && npm run build
```

If already available elsewhere (a prior clone, or once published, the
`nocontext` binary on PATH), use that instead of re-cloning. Semantic
scoring (`minilm-l6-v2`) is optional and requires
`npm install @huggingface/transformers` in that same clone; skip it and the
tool still runs lexical-only (`bm25`) with a warning, which is fine for a
quick check.

## Running it

You need real questions — a routing score without credible questions isn't
useful. Never generate questions from the navigation surface you're about to
score; that's circular and flatters every corpus. Write questions from the
document bodies instead, phrased the way a person actually asks, or ask the
user for real ones (support threads, issue discussions, contributor
questions) if they have them.

```bash
node /tmp/nocontext/dist/surfaces/cli.js <path-to-repo> \
  --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions /tmp/probes.json \
  --evaluate
```

`--surface` picks the navigation file; omit it to auto-detect
(`AGENTS.md` → `CLAUDE.md` → `index.md` → `README.md`). `--include` scopes
the corpus — always set it explicitly on a monorepo, or the full-text
reference becomes meaningless. `--questions` takes a JSON file:

```json
{
  "origin": "generated",
  "probes": [
    { "question": "Do migrations run before or after the deploy?", "expect": "docs/deploy-policy.md" }
  ]
}
```

Use `--diagnose` instead of `--evaluate` when the goal is to find and fix
gaps: it shows source-grounded vocabulary the navigation entry is missing.
Never use `--diagnose` output to report a score — it exists to produce edit
suggestions, not evidence, and mixing the two misrepresents what was proven.
Keep a separate held-out question set for `--evaluate` if a fix is going to
be verified afterward; scoring an index against the same questions used to
fix it is training-set evaluation, not evidence that navigation improved.

## Reading the output

Every run reports three numbers together — never quote one alone:

- **floor** — what random guessing would score, given the corpus size
- **observed** — routing using only the navigation surface
- **full-text reference** — routing with entire documents available, same retriever

The gap between observed and the full-text reference is what an index rewrite
can fix. If the full-text reference itself is low, the answer isn't
reachable by this retriever at all — say so, and don't imply a rewrite will
help.

Report the numbers plainly, name specific unreachable questions and their
expected documents (shown under "unreachable" in the CLI output), and pass
along any warnings the tool prints — including a keyword-stuffing or
probe-leakage warning if one fires, which means the result may be gamed
rather than genuine.

## What not to claim

Never tell a user that a `nocontext` score means their agent will hallucinate
less, ground more answers, or perform better in production. That correlation
is an open research question this project has not yet answered. The honest
claim is narrower: *this navigation surface does or doesn't route this
specific set of questions to the right document, under this retriever.*
