# PLANNER

Working document for anyone, human or agent, picking this project up. It is
written to be self-contained: you should not need the conversation that
started it.

Read [`docs/METHOD.md`](docs/METHOD.md) and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before writing code. This file
says what we are building, in what order, and — critically — **what evidence
each phase has to produce before the next one is allowed to start.** A phase
with no unchecked evidence item is not done, however much code sits under it.

---

## 1. What this is

`nocontext` is a retrieval-quality linter for the files coding agents already
read: `AGENTS.md`, `CLAUDE.md`, `README.md`, a `docs/` folder, an OKF bundle.
It measures whether an agent pointed at that corpus can actually **reach** the
right document when someone asks a question a human wrote it to answer.

Existing tools in this space check whether documentation is *valid*:
frontmatter present, links resolve, dates fresh. None check whether it is
*findable*. A corpus can pass every linter in existence and still be
unreachable, and when it is, nothing errors — the agent answers anyway, from
its own priors, with no source behind it, and no log records that it happened.

We call that the **ungrounded rate**: `1 − P@1`, the share of answerable
questions where the agent's single best guess would not reach its source.

## 2. Where this sits, and why it isn't a duplicate

Two recent benchmarks measure retrieval quality in coding agents:

- **[ContextBench](https://arxiv.org/abs/2602.05892)** — 1,136 issue-resolution
  tasks, 66 repositories, human-annotated gold contexts. Finding: "sophisticated
  agent scaffolding yields only marginal gains in context retrieval."
- **[Agent Retrieval Bench](https://arxiv.org/html/2607.24882v1)** — 427
  samples across four task types. Finding: interactive agents still miss gold
  context on 27–35% of samples even with exploration. Best sample-weighted MRR
  reported: 0.24.

Both **fix the repository and vary the retriever or agent.** `nocontext` does
the opposite: **fix the retriever, vary the navigation surface** (the index).
ARB states explicitly that it does not measure whether documentation
organisation affects retrieval. That is the axis this project owns. We report
the same metrics they do — P@1, MRR, Recall@k — precisely so a result here is
legible to someone who has read either paper, not legible only inside this
repo.

**A related null result we have to answer, not ignore:** a preregistered
ablation on [progressive disclosure in LLM wikis]
(https://arxiv.org/pdf/2607.04576) found minimal impact from nested vs. flat
structure. Our claim is about **vocabulary**, not structure — a different
variable — but this is exactly the kind of adjacent-and-negative result a
critic will raise first. `docs/METHOD.md` addresses it directly. Any phase
work that touches the core claim should re-check that this distinction still
holds.

## 3. The claim we are trying to earn, and the one we haven't

Two separate claims. Do not let them blur into one.

**Claim A — demonstrated:** an index written the way a person summarises a
concept routes worse, under a standard retriever, than the same content
indexed in the vocabulary a person actually searches with. Shown on a
hand-built corpus constructed specifically to isolate this variable (see
`examples/`). This is a mechanism demonstration, not evidence about the real
world — the corpus was built to make the effect visible.

**Claim B — not yet demonstrated, and the actual point of the project:** a
higher `nocontext` score causes an agent to succeed more often on real tasks,
in real repositories nobody built to prove anything. Until Claim B has
evidence, this is a retrieval-quality curiosity, not a tool with a reason to
exist. **Phase 4 exists solely to test Claim B, and it is allowed to fail.**
If it fails, the honest move is to publish that finding and stop, not to
quietly narrow the claim until something sticks.

## 4. Non-negotiables

Breaking any of these silently invalidates every number the tool produces.
If you think one is wrong, open an issue and argue it. Do not route around it.

### Measurement

- **Standard IR metrics, not an invented scale.** P@1, MRR, Recall@{1,3,5} —
  what ContextBench and ARB report. `RankMetrics` in `src/core/types.ts` is
  the only shape a `Measurement` may expose.
- **Floor, observed, ceiling — always all three.** A bare percentage is
  unreadable without corpus size behind it. `Measurement` has no field for a
  single headline number, on purpose.
- **The ceiling is retriever-limited, not absolute.** Never describe it in
  docs, code comments, or output as "what perfect navigation would achieve."
  It is "what this retriever manages with the whole document available." An
  earlier draft of `METHOD.md` got this wrong; it was corrected in the open
  once Phase 1 running the numbers proved it wrong. Do not regress the wording.
- **Probes never come from the index.** Generating questions from the
  navigation surface and testing that surface against them is circular. Probes
  come from document bodies with the index withheld, or from supplied query
  logs.
- **Two retrievers, never averaged.** A keyword-stuffed index scores high
  lexically and flat semantically. That divergence is the cheat detector.
  Reporting one retriever alone destroys it. **Currently only one retriever is
  implemented** (`bm25`) — see Phase 3. Until the second lands, the tool is
  gameable by design, and `README.md` says so.
- **Supplied and generated probes are never blended.** `Probe.origin` is on
  the type so this cannot happen by accident.

### Architecture

- **Core does no I/O.** No filesystem, no printing, no `process.exit`, no
  throwing for control flow. It takes a `CorpusSource`, returns a `Run`.
- **One entry point.** Every surface calls `analyze(source, options)`. A
  surface that assembles the pipeline itself is a bug in the signature, not a
  licence to duplicate.
- **Documents arrive through `CorpusSource`.** Two methods, `list` and `read`.
  The filesystem is one implementation. An MCP server is handed documents it
  already holds; a browser has no filesystem.
- **`Run` stays plain serializable data.** It crosses process boundaries.

### Fixtures

`examples/` is a controlled experiment: four corpora with byte-identical
documents and byte-identical probes, varying only the navigation surface.
Generated from `examples/source/` by `examples/build.py`.

- **Never edit a variant in place.** Edit source, run `npm run examples`.
- `examples/stuffed-index` exists to cheat. If a change lets it pass clean
  *after* Phase 3 ships the semantic retriever, the change is wrong.

## 5. Current state

**Done and gated (Phase 1, Phase 2 partial):**

- `docs/METHOD.md`, `docs/ARCHITECTURE.md`, published before results existed
- Type contracts, split into core / sources / surfaces (`src/`)
- Filesystem `CorpusSource`, corpus loading, navigation-surface detection
- BM25 retriever, scoring in standard IR metrics, `analyze()`
- Text and JSON reporting, working CLI (`node dist/surfaces/cli.js <dir>`)
- Four example corpora + 19 hand-written probes, generated from one source
- 9 tests passing, including the Phase 1 gate (below), CI green
- README rewritten to name the actual files/mechanism and to state plainly
  what is and isn't validated yet

**Verified by running the actual code, not assumed:**

- All four example corpora report an identical ceiling (predicted in advance)
- `retrieval-index` beats `human-index`: P@1 53% vs. 37%, MRR 0.58 vs. 0.37
- `human-index` observed MRR (0.37) is *below* its own random floor (0.41) —
  a bad index is worse than guessing, not neutral
- `stuffed-index` scores 79% P@1, beating the 74% full-text ceiling — the
  gaming hole in Claim A's own demonstration corpus, currently open

**Not started:** semantic retriever, probe generation, the Phase 4 validation
study (the one that actually matters), all of Phase 5 distribution.

## 6. Build order

Each phase has three parts: what to build, what evidence it must produce, and
the criteria for passing or killing it. A phase is not complete until every
row in its Evidence table has a real value, not a placeholder.

### Phase 1 — Make it measure something ✅ PASSED

**Built:** filesystem source, corpus/surface loading, BM25, scoring, `analyze`.

**Evidence produced:**

| required | result |
|---|---|
| All four corpora report the same ceiling | ✅ 73.7% across all four |
| `retrieval-index` observed > `human-index` observed | ✅ 53% vs. 37% P@1 |
| Gate encoded as a test, not just observed once | ✅ `src/gate.test.ts` |

**Success criterion:** met. **Kill criterion (would have been):** if ceilings
diverged, the corpus-loading or scoring code reads something inconsistent
across variants with byte-identical documents — that is a correctness bug, not
a modelling choice, and blocks every later phase.

### Phase 2 — Make it readable ✅ PASSED

**Built:** `report/text.ts`, `report/json.ts`, `surfaces/cli.ts`.

**Evidence produced:**

| required | result |
|---|---|
| `node dist/surfaces/cli.js <dir>` runs and prints on a fresh clone | ✅ verified from `/tmp` clone |
| Output legible without reading the docs first | ✅ (subjective — re-verify with an outside reader before Phase 5) |
| JSON output round-trips enough to resolve a disputed score | ✅ per-probe outcomes with rank included |

**Success criterion:** met, with one open item — "legible to a stranger" was
checked by the person who built it. Re-verify with someone who hasn't, before
this phase is trusted for Phase 5 distribution.

### Phase 3 — Make it hard to fool

**Build:**

- [ ] `src/core/retrievers/semantic.ts` — embeddings, degrades cleanly with no
      key present
- [ ] Stuffing warning: fires when lexical leads semantic by a wide margin
- [ ] `src/core/probes/` — generation from bodies, index withheld, written to
      disk on every run

**Evidence required before this phase counts as done:**

| required | how to check |
|---|---|
| `examples/stuffed-index` trips the stuffing warning | `gate.test.ts` currently asserts the *opposite* (documents the hole) — flip this assertion when semantic lands and it must then pass |
| `examples/retrieval-index` does **not** trip the warning | false-positive check, same test file |
| Semantic retriever runs with no API key and does not crash the CLI | manual run with key unset |
| Generated probes, read blind, look like something a real user would ask | manual spot-check, at least 20 generated probes across 3 different corpora |

**Success criterion:** the stuffed corpus is caught and the honest corpus
isn't, both as automated tests, not eyeballed once.

**Kill/descope criterion:** if a semantic retriever cannot be made to run
without a paid API key in a way that keeps the free CLI experience intact,
descope to "warn that stuffing detection requires `--semantic` and an API key"
rather than silently shipping a tool that is gameable by default forever.

### Phase 4 — Prove the score predicts something real

**This is the phase that decides whether the project continues.** Everything
before it demonstrates a mechanism on a corpus built to show it. This is the
first test against reality, and it is explicitly allowed to fail.

**Build:**

- [ ] Select 8–12 real public repositories with an existing `AGENTS.md`,
      `CLAUDE.md`, or maintained `docs/` — not written by this project, not
      selected because they already look bad or good
- [ ] For each: run `nocontext`, recording P@1/MRR/Recall@k
- [ ] For each: construct 10–15 real questions a contributor plausibly has,
      independent of and blind to the `nocontext` score
- [ ] Run an actual agent (Claude Code or Codex) against each repo on those
      questions, and record, per question: did it cite/use the real doc, or
      answer ungrounded — a human-graded binary, not a proxy metric
- [ ] Compute the correlation between `nocontext` score and grounded-answer
      rate across the 8–12 repos

**Evidence required:**

| required | why it's the actual gate |
|---|---|
| Correlation coefficient and its direction, reported however it comes out | this is the number that justifies (or kills) the project |
| The repo selection method written down *before* running, so selection bias is checkable | otherwise the result is unfalsifiable |
| Per-repo raw data (score, questions, agent transcripts) published alongside the summary | so someone can dispute a specific data point, per `CONTRIBUTING.md` |
| Sensitivity check: does the correlation hold with a different probe author, a different agent, a different retriever? | one run of anything is an anecdote |

**Success criterion:** a positive, non-trivial correlation between
`nocontext` score and grounded-answer rate, with the raw data published and
reproducible by someone else.

**Kill criterion, stated explicitly so it isn't dodged later:** if there is no
meaningful correlation across a reasonably chosen set of real repos, **say so
publicly, in `METHOD.md`, and stop building distribution surfaces.** A
retrieval-quality score that doesn't predict grounding is a toy. Rewriting the
claim to survive a null result here is the one failure mode this whole
planning document exists to prevent. See §2's discussion of the progressive-
disclosure null result — do not become the thing that null result already
warned about.

**Only past this gate does any output get called a "finding" or a "benchmark"
in public.**

### Phase 5 — Make it reach people

Only starts if Phase 4 passes.

**Build:**

- [ ] `action/` — GitHub Action, PR annotations, `--fail-under` gate
- [ ] `src/surfaces/mcp.ts` — MCP server: a `CorpusSource` plus a formatter,
      nothing more, per `docs/ARCHITECTURE.md`. Claude Code, Codex, Cursor,
      Windsurf.
- [ ] `skill/` — agent skill manifest so agents self-check corpora they author
- [ ] Publish to npm so `npx nocontext` works

**Evidence required:**

| required | how to check |
|---|---|
| MCP server works unmodified in at least 2 of {Claude Code, Codex, Cursor, Windsurf} | manual integration test in each |
| GitHub Action produces a correct PR annotation on a real PR that changes docs | dogfood on this repo or a volunteer's |
| `npx nocontext ./docs` works from a machine that has never touched this repo | ask someone else to try it |

**Success criterion:** a stranger can adopt one distribution surface without
reading `PLANNER.md`, `METHOD.md`, or asking a question.

## 7. Deliverables

| surface | form | status |
|---|---|---|
| Library | `import { analyze } from "nocontext"` | phase 1 — done |
| CLI | `node dist/surfaces/cli.js ./docs` (→ `npx nocontext` later) | phase 2 — done |
| Anti-gaming | semantic retriever + stuffing warning | phase 3 — not started |
| **The finding** | **published correlation between score and grounding** | **phase 4 — not started, the actual deliverable** |
| GitHub Action | fails a build when findability drops | phase 5 |
| MCP server | one config line, works in any MCP client | phase 5 |
| Agent skill | agents self-check corpora they write | phase 5 |

The finding in Phase 4 is the actual deliverable. Every surface in Phase 5 is
a way to act on it, and none of them are worth building if Phase 4 fails.

## 8. Launch criteria

Do not announce anywhere until all of these hold:

- [ ] Phase 3 gate passes: the stuffed corpus is caught by an automated test
- [ ] **Phase 4 has run and produced a result**, positive or negative, with raw
      data published either way
- [ ] If Phase 4 was positive: the tool runs on at least 10 more real public
      corpora beyond the validation set, without crashing
- [ ] `METHOD.md` includes limitations discovered during Phase 4, not just the
      ones anticipated before it ran
- [ ] A stranger, not the person who built this, can clone, run, and
      understand the output without asking a question

The repo is public now on purpose: `METHOD.md` is timestamped in git before
any result existed, which is the strongest available answer to "you designed
the method to fit the number." Public is not the same as announced.

## 9. Verifying your work

```bash
npm ci
npm run typecheck
npm test
npm run examples && git diff --exit-code examples/   # fixtures must not drift
```

CI runs all of this. It also regenerates `examples/` and fails if the
committed tree has moved, because fixture drift voids the control without
anything appearing to break.

## 10. What gets rejected

- Any output path that reports a score without its floor and ceiling
- Any change that lets `examples/stuffed-index` pass clean *after* the
  semantic retriever exists (before it exists, this is a known, documented gap)
- Measurement logic in a surface rather than in core
- `console.log` anywhere under `src/core/`
- Blending supplied and generated probes
- Calling anything a "finding" or "benchmark" before Phase 4 passes
- Narrowing or reframing Claim B to survive a negative Phase 4 result instead
  of publishing the negative result

## 11. Open questions

Genuinely undecided. Argue for an answer in an issue rather than picking one
silently:

- How many probes per document is enough for Phase 4's real-repo runs?
  Fixture default is 5 per document, chosen arbitrarily, and Phase 4 needs its
  own answer since real repos vary wildly in size.
- Should the ceiling use the same retriever as observed, or the best available
  retriever, once more than one exists?
- For a corpus with no index, is the file tree the honest surface, or should
  `README.md` count as an index when one exists? (Current implementation
  already treats `README.md` as an index candidate in `sources/filesystem.ts`
  — is that the right call, or should it be `implicit` too?)
- Do we score a document that no probe targets, or is corpus coverage a
  separate metric?
- What counts as "grounded" in Phase 4's human grading? Citing the file
  explicitly, or paraphrasing its content correctly without citing it?
  This needs an answer *before* Phase 4 starts, not during grading.
