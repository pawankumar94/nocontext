<p align="center">
  <img src="docs/assets/logo.svg" width="72" alt="nocontext">
</p>

<h1 align="center">nocontext</h1>
<p align="center"><strong>A retrieval-quality linter for AGENTS.md, CLAUDE.md, and the docs your coding agent reads before it reads anything else.</strong></p>

<p align="center">
  <img alt="status: pre-v1, CLI only" src="https://img.shields.io/badge/status-pre--v1%2C%20CLI%20only-9AA0A6">
  <a href="docs/METHOD.md"><img alt="method published before results" src="https://img.shields.io/badge/method-published%20before%20results-E07B39"></a>
  <img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-9AA0A6">
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#project-status">Status</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#integrations">Integrations</a> ·
  <a href="#how-scoring-works">Scoring</a> ·
  <a href="#roadmap-to-v1">Roadmap</a>
</p>

---

## What this is

Coding agents read a map before they read anything else — `AGENTS.md`,
`CLAUDE.md`, a docs index — to decide which file answers a given question. A
map can list the right file and still fail to route a real question to it.

You write that map the way you'd explain the project to a colleague: *"what
must be true before a production rollout."* A contributor asks *"do
migrations run before or after the deploy?"* If the map's wording doesn't
route that question to the right file, the agent misses it — sometimes
silently, sometimes not; see [Project status](#project-status) for what's
actually proven about that.

`nocontext` finds those mismatches, and it has two modes on purpose:

| | command | for | promise |
|---|---|---|---|
| **Assist** | `nocontext .` | anyone, no setup | a miss list: what a question hits, what it should hit, which words to add. Never a score. |
| **Verify** | `nocontext . --questions held-out.json --evaluate` | CI, defensible numbers | the same retrieval metrics published research on agent context-acquisition uses (P@1, MRR, Recall@k — see [How scoring works](#how-scoring-works)) |

Assist mode is the default and needs nothing from you but a repo. Verify mode
is the full protocol — held-out probes, frozen extractors, rejected
comparisons — and it's still there, just not the only door in.

## Project status

**Read this before anything else below.** `nocontext` is pre-v1. Here's
exactly what that means, so you can decide if it's useful to you today.

| | |
|---|---|
| **What works** | Two CLI modes: zero-config assist mode (`nocontext .`, no probes needed, a miss list from mechanical topic checks) and the full verify protocol (lexical + optional local semantic retrieval, diagnose/evaluate, before/after comparison). [43 tests](.github/workflows/ci.yml) passing. |
| **What's proven** | The effect replicates: rewriting a navigation surface in retrieval-friendly vocabulary measurably improves routing, on a fixture built to show it *and* on three real, unmodified repos nobody selected to prove a point (Codex, NVIDIA NVCF, Vercel AI SDK — [`validation/phase4/`](validation/phase4/), lexical P@1 improved +33 to +83 points on held-out questions). |
| **What's *not* proven yet** | That a better `nocontext` score causes an agent to actually ground more answers, or explore less, on real tasks. That's [Phase 4b](PLANNER.md#phase-4b--does-it-change-what-a-real-agent-does-still-open) — a single-repo test, not started. Treat every score today as a routing diagnostic, not a validated agent-performance predictor. |
| **Coding-agent integrations** | **`SKILL.md` in progress** (Claude Code, Cursor, Codex, Hermes — see [Integrations](#integrations)). No MCP server, GitHub Action, or npm package yet; those are gated on Phase 4. Until the skill lands, `nocontext` is a CLI you clone, build, and run by hand. |

If you want a tool that plugs into your coding agent right now (an MCP
server, an automatic check inside Claude Code or Cursor), this isn't that
yet — see [Integrations](#integrations). If you want to see whether your
`AGENTS.md` actually routes real questions, that works today with zero
setup — see [Quickstart](#quickstart).

## Quickstart

```bash
git clone https://github.com/pawankumar94/nocontext && cd nocontext
npm ci && npm run build
node dist/surfaces/cli.js examples/no-index
```

```text
$ nocontext examples/no-index

  surface   file tree (no navigation file found)  (auto)
  6 topic probes from doc headings — mechanical, not real questions. See below.
  top-1 miss  1/6

  [ ] "On-call rotation"
      hit nothing, gold is docs/oncall.md
      add: on-call, rotation

  These are mechanical topic checks, not real questions a person would ask.
  Review or replace them at examples/no-index/nocontext-topic-probes.json, then get a comparable score with:
    nocontext . --questions examples/no-index/nocontext-topic-probes.json --evaluate
```

That's real, unedited output from a real run — no flags, no probe file you
had to write first. `nocontext` auto-detected there's no navigation file,
generated its own mechanical topic probes from the doc headings (never a
real question, and it says so), and found one: nothing in this corpus routes
to `docs/oncall.md`. It also wrote those probes to disk so you can read,
edit, or throw them away.

Not on npm yet. Once it is, this becomes `npx nocontext .`.

## Usage

### Assist mode — the default, for a maintainer on a Sunday night

```bash
node dist/surfaces/cli.js .
```

No flags needed. It auto-detects a navigation surface (`AGENTS.md` →
`CLAUDE.md` → `index.md` → `README.md`, or the file tree if none exists),
generates mechanical topic probes from your own doc headings, and prints a
miss list: what a probe hits, what it should hit, and which words to add. It
never prints a metrics table and never calls itself a score — see
[the topic-probe caveat](docs/PROBES.md) for exactly why that distinction
matters.

If you have real questions (support threads, issue titles, things
contributors actually asked), pass them and skip topic-probe generation
entirely:

```bash
node dist/surfaces/cli.js . --questions real-questions.json
```

### Verify mode — for CI and a defensible score

The full protocol this project was built around: held-out probes, dual
retrievers, frozen extractors, rejected incompatible comparisons. This is
what makes a `nocontext` number worth trusting, and it's still exactly as
strict as before — it's just no longer the only door in.

```bash
# Diagnose: see source-grounded vocabulary gaps, using development questions
node dist/surfaces/cli.js . --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions development.json --diagnose

# Evaluate: score held-out questions without leaking edit suggestions
node dist/surfaces/cli.js . --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions held-out.json --evaluate --json > before.json

# After revising AGENTS.md, compare against the baseline
node dist/surfaces/cli.js . --surface AGENTS.md \
  --include docs --include CONTRIBUTING.md \
  --questions held-out.json --evaluate --baseline before.json
```

| flag | does |
|---|---|
| `--surface <file>` | navigation file to score, e.g. `AGENTS.md`. Auto-detects if omitted. |
| `--include <path>` | document file or directory to include in the corpus. Repeatable. Scope large monorepos with this. |
| `--questions <file>` | real or reviewed probes. Skips topic-probe generation. Required for `--diagnose`/`--evaluate`. |
| `--diagnose` | shows source-grounded edit suggestions from development questions. Cannot drive a CI threshold. |
| `--evaluate` | scores held-out questions with full metrics, never leaks suggestions. |
| `--baseline <file>` | compares this evaluate run against a prior `--json` run. Rejects incompatible comparisons instead of producing a misleading delta. |
| `--fail-under <pct>` | exit 1 when lexical P@1 falls below this. Requires `--evaluate` — a topic-probe run can never gate a build. |
| `--json` | full run record: probes, per-probe outcomes, retriever versions. |

If no navigation surface exists at all, the file tree is scored and labelled
an implicit surface — not silently compared 1:1 against a corpus that has a
real index.

**Semantic scoring is opt-in**, in both modes. `npm install
@huggingface/transformers` yourself; the first run then downloads a pinned
local MiniLM model, no API key, no document content leaves the machine. Skip
it and `nocontext` still runs lexical-only, with a warning naming the missing
package. It's opt-in because that dependency's current release carries real
transitive advisories — see
[CONTRIBUTING.md](CONTRIBUTING.md#the-optional-semantic-dependency) for the
full reasoning and why the base install audits clean.

## Integrations

This table is the plan. Only the skill is unblocked today — see
[Roadmap to v1](#roadmap-to-v1) for why the rest waits on Phase 4.

| surface | target clients | status |
|---|---|---|
| Agent skill (`SKILL.md`) | Claude Code, Cursor, Codex, Hermes | **in progress — not gated on Phase 4** |
| MCP server | Claude Code, Cursor, Codex, any MCP-capable client | not started — Phase 5, gated on Phase 4 |
| GitHub Action | CI, any repo | not started — Phase 5, gated on Phase 4 |
| npm package | `npx nocontext` anywhere | not started — Phase 5, gated on Phase 4 |

Most of this is gated on Phase 4, not on engineering effort — every surface
above is a thin adapter over one function, `analyze(source, options)`, per
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Shipping the MCP server, the
Action, or the npm package before Phase 4 tests whether a better score
actually helps an agent would mean distributing an unproven claim into tools
people trust for real work.

**The skill is the one exception**, and deliberately so: it makes no claim
about agent grounding. It runs the existing CLI via `Bash` and shows the
score — a measurement, not a promise about what the measurement means. Cursor
documents loading skills from Claude and Codex directories, and Hermes Agent
independently documents support for the same `SKILL.md` format, so one file
reaches four clients. See [Roadmap to v1](#roadmap-to-v1).

## How scoring works

Every run reports three numbers, never one alone — a bare percentage is
unreadable without knowing what it's relative to:

| | |
|---|---|
| **Floor** | what a random ranking would score. Shrinks as the corpus grows. |
| **Observed** | routing using only your index (or file tree, if none exists) |
| **Full-text reference** | routing with entire documents available, same retriever |

The gap between observed and the full-text reference is what a navigation
rewrite can fix. Metrics are P@1, MRR, and Recall@{1,3,5} — the same ones
[ContextBench](https://arxiv.org/abs/2602.05892) and
[Agent Retrieval Bench](https://arxiv.org/html/2607.24882v1) report, not a
scale invented for this project. Those two benchmarks fix the repository and
vary the retriever or agent; `nocontext` fixes the retriever and varies the
navigation surface, which neither of them measures. Full reasoning, including
five objections to this methodology with direct answers, in
[`docs/METHOD.md`](docs/METHOD.md).

**Can this be gamed?** Yes — BM25 rewards copied query vocabulary, and the
first embedding experiment showed semantic retrieval doesn't reliably catch
that either. `nocontext` detects direct probe leakage and keeps diagnose and
evaluate modes separate, but doesn't claim to catch every optimized index.
[`examples/stuffed-index/`](examples/stuffed-index) is the committed
adversary this has to keep catching.

## Roadmap to v1

Full detail, evidence requirements, and kill criteria per phase: [`PLANNER.md`](PLANNER.md).

- [x] **Phase 1–2** — core measurement, CLI, reporting
- [~] **Phase 3** — anti-gaming, diagnose/evaluate workflow. Built and
      tested; the human blind review of validation probes
      ([in progress](validation/phase3/README.md)) is the remaining gate.
- [ ] **Phase 4** — prove a better score changes agent grounding or
      exploration cost on real tasks. Preregistered, not started. **This is
      the phase that decides what v1 is allowed to claim**, and it's
      explicitly allowed to fail — see the kill criterion in `PLANNER.md`.
- [~] **Agent skill** — `SKILL.md`, unblocked, running in parallel with
      Phase 3/4. Doesn't need Phase 4 because it makes no grounding claim,
      just runs the CLI and shows the score.
- [ ] **Phase 5** — MCP server, GitHub Action, npm publish. Gated on Phase 4,
      not on engineering effort.

There is no committed date. Phase 4 is a real empirical study, not a task
with a fixed size, and its outcome determines whether v1 ships as "measures
whether agents ground their answers" or a narrower "routing diagnostic for
your instruction files," per the pre-committed branches in `PLANNER.md`.

## Contributing

The most valuable contribution is a corpus that proves a score wrong, or an
argument that the methodology is unsound — see
[`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/METHOD.md`](docs/METHOD.md),
which is written to be attacked.

## License

MIT
