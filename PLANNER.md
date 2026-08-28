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

The adjacent market is no longer empty. [`agenteval`](https://github.com/lukasmetzler/agenteval)
lints instruction files, harvests tasks from git, runs coding agents, and
compares behavior. [`agentlint`](https://github.com/agentlint/agentlint) scores
repository readiness across agent configuration files. `nocontext` should not
duplicate either product. Its narrower job is to test the routing layer between
a real question and the documentation source that answers it, then produce a
specific navigation edit a maintainer can verify on held-out questions.

We report the **top-1 routing miss rate**: `1 − P@1`, the share of answerable
questions where a retriever's first choice would not reach its source. This is
not labelled an agent grounding rate until Phase 4 earns that relationship.

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

Three separate claims. Do not let them blur into one.

**Claim A — demonstrated:** an index written the way a person summarises a
concept routes worse, under a standard retriever, than the same content
indexed in the vocabulary a person actually searches with. Shown on a
hand-built corpus constructed specifically to isolate this variable (see
`examples/`). This is a mechanism demonstration, not evidence about the real
world — the corpus was built to make the effect visible.

**Claim B — not yet demonstrated:** a higher `nocontext` score predicts better
context acquisition under a fixed retrieval policy. This is a predictive
claim. A correlation across real repositories can test it, but cannot show
that changing an index caused the agent outcome.

**Claim C — not yet demonstrated, and the actual point of the project:**
rewriting a navigation surface so the same documents are easier to retrieve
causes an agent to ground more answers, or reach the same answer quality with
less exploration. This needs a paired intervention inside each repository:
same documents, same questions, same agent and budget, different navigation
surface. **Phase 4 exists to test Claims B and C, and it is allowed to fail.**
If neither grounding nor exploration cost moves, publish that result and stop
building distribution surfaces.

**Claims B and C have a known boundary condition, found before Phase 4
started.** See
[§3a](#3a-the-pilot-what-a-real-agent-actually-does). A real agent with
unrestricted file access on a small corpus routes around a bad index almost
for free, and the effect Claim A demonstrates does not show up in its
behaviour. Phase 4 has to measure this boundary or it will spend a great
deal of effort re-discovering a null result we already have for free.

### 3a. The pilot: what a real agent actually does

Before committing to the full Phase 4 study, we ran a cheap version of it: one
real project's real, unedited docs (Backlog.md's `AGENTS.md`,
`CONTRIBUTING.md`, `DEVELOPMENT.md`, `ADVANCED-CONFIG.md`,
`CLI-INSTRUCTIONS.md` — 5 files, 680 lines total, nothing here built to prove
a point), 17 questions written from real facts and locked before either index
existed, and two navigation surfaces: the project's own real README link text
("as-is"), and the same content rewritten in the vocabulary of the questions
("retrieval"). Full record: `docs/pilot-2026-08-28.md`.

**Under BM25**, the as-is index scored 18% P@1 — below its own 20% random
floor — and the retrieval-rewritten index scored 71%, at the ceiling. Claim A
confirmed hard, on a real corpus, not just the hand-built fixture.

**Under a real Claude subagent with Read+Bash**, same corpus, same questions,
blind to which index "should" win: **17/17 grounded under both indexes. No
difference.** The agent read the index, then opened candidate files freely and
checked; on a corpus this small that costs it almost nothing, so the index's
wording barely mattered.

**What this means for the plan, concretely:** the vocabulary-mismatch effect
is real and is currently invisible to answer quality when an agent can cheaply
explore past a bad index. It may still change files opened, tool calls, tokens,
or latency. It should affect grounding more strongly on a large corpus, under
rank-based retrieval, or under a real exploration budget. **Phase 4 crosses
those access conditions instead of selecting only the ones where a positive
result looks likely.** Small, freely explorable corpora stay in the study as a
negative control and a measured boundary.

## 4. Non-negotiables

Breaking any of these silently invalidates every number the tool produces.
If you think one is wrong, open an issue and argue it. Do not route around it.

### Product value

- **A phase does not pass because code exists or a fixture turns green.** A
  real maintainer must be able to trust the result, understand what failed,
  and take a concrete next action. If the output does not improve an agent or
  the person maintaining its context, it is unfinished.
- **Do not tune implementation rules to the bundled examples.** The examples
  test a general mechanism. A rule added because one fixture sentence needs it
  is benchmark overfitting, even when the test suite passes.
- **The wedge is retrieval through documentation navigation surfaces.** Other
  tools already lint instruction-file structure, token budgets, stale links,
  overlap, and task compliance. Do not turn `nocontext` into another general
  `AGENTS.md` score. It owns the question: can this navigation surface route a
  real question to the source that answers it?
- **The default workflow must be safe to trust.** Weak generated questions,
  unexplained scores, or a warning that only catches the bundled adversary are
  worse than an explicit requirement for human-reviewed input.

### Measurement

- **Standard IR metrics, not an invented scale.** P@1, MRR, Recall@{1,3,5} —
  what ContextBench and ARB report. `RankMetrics` in `src/core/types.ts` is
  the only shape a `Measurement` may expose.
- **Floor, observed, full-text reference: always all three.** A bare percentage is
  unreadable without corpus size behind it. `Measurement` has no field for a
  single headline number, on purpose.
- **The full-text reference is retriever-limited, not absolute.** Never describe
  it in docs, code comments, or output as "what perfect navigation would
  achieve." Concise surface text can outperform a long full document for a
  retriever. Report the signed map gap rather than clamping that result away.
- **Surface extraction is versioned.** A routing score is only about the
  pointer extractor that produced it. The current `pointer-block@1` retains a
  pointer's heading and path-bearing line, not arbitrary surrounding prose.
  Baselines cannot cross extractor versions.
- **Probes never come from the index.** Generating questions from the
  navigation surface and testing that surface against them is circular. Probes
  come from document bodies with the index withheld, or from supplied query
  logs.
- **Two retrievers, never averaged.** Lexical and semantic results expose
  different routing failures and must remain separate. The first real semantic
  run disproved the assumption that their divergence detects stuffing, so
  anti-gaming now relies on direct leakage checks and held-out evaluation.
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
- `examples/stuffed-index` exists to cheat through direct probe leakage. If a
  change lets it pass clean, the change is wrong.

## 5. Current state

**Done and gated (Phase 1 and Phase 2):**

- `docs/METHOD.md`, `docs/ARCHITECTURE.md`, published before results existed
- Type contracts, split into core / sources / surfaces (`src/`)
- Filesystem `CorpusSource`, corpus loading, navigation-surface detection
- BM25 and pinned local MiniLM retrievers, reported separately
- `analyze()` with direct probe-leakage detection and probe validation
- Diagnose mode with source-grounded edit candidates; evaluate mode suppresses
  them and is the only mode allowed to drive a threshold
- Reviewed probe format and held-out workflow documented in `docs/PROBES.md`
- Guarded `--baseline` comparison for held-out before-and-after runs; it rejects
  changes to probes, document fingerprints, surface identity, retriever
  versions, floors, or ceilings
- Explicit `AGENTS.md`, `CLAUDE.md`, `index.md`, or `README.md` surface
  selection, including `--surface` when more than one exists
- Repeatable document scoping with `--include`, so unrelated monorepo Markdown
  does not distort the floor, ceiling, or retrieval candidates
- Text and JSON reporting, working CLI (`node dist/surfaces/cli.js <dir>`)
- Four example corpora + 19 hand-written probes, generated from one source
- 38 tests passing, including the Phase 1 gate and Phase 3 safety boundaries
- A packed-tarball smoke test installs in a clean temporary project and runs
  both retrievers. That test also exposed a distribution blocker recorded
  below; local `npm audit` alone was not sufficient release evidence.
- README rewritten to name the actual files/mechanism and to state plainly
  what is and isn't validated yet

**Verified by running the actual code, not assumed:**

- All four example corpora report an identical ceiling (predicted in advance)
- `retrieval-index` beats `human-index`: P@1 53% vs. 37%, MRR 0.58 vs. 0.37
- `human-index` observed MRR (0.37) is *below* its own random floor (0.41) —
  a bad index is worse than guessing, not neutral
- The original stuffed fixture reached 95% semantic P@1, disproving semantic
  divergence as the planned cheat detector
- The current adversarial fixture directly leaks probe questions and is caught;
  the honest retrieval fixture does not produce the leakage warning

**Also run — the pilot, ahead of schedule and cheap on purpose:**

- BM25 confirms Claim A on a real project's real docs (Backlog.md), not just
  the hand-built fixture: 18% P@1 (below floor) vs. 71% (at ceiling)
- A real Claude subagent shows **no difference** between the two indexes on
  that same corpus — 17/17 grounded either way, because the corpus is small
  enough to explore for free. See §3a. This reshaped Phase 4's repo-selection
  criteria before any of the 8–12 repos were picked, which is the entire
  reason the pilot was worth running before the expensive version.

**In progress:** Phase 3. The implementation pieces pass locally. The phase is
not complete until reviewed probes and held-out improvements are demonstrated
across three real corpora. Phase 4 and all Phase 5 distribution remain unstarted.

**Current development checkpoint, 2026-08-28:** `pointer-block@1` is now the
frozen extractor for Phase 3. The repository is at the evidence gate: blind
review the 36 body-only candidate probes, retain at least 20 across all three
corpora, classify each accepted question as a coverage or vocabulary case, use
only development misses to revise each navigation surface, and measure the
locked held-out change. Do not begin Phase 4 from the current tree. npm
distribution is separately blocked by the clean-consumer audit described in
Phase 3.

**Review material prepared, not yet accepted:**
`validation/phase3/` pins 36 candidate generated development and held-out
probes for OpenAI Codex, NVIDIA NVCF, and Vercel AI SDK. Each source checkout,
navigation surface, and `pointer-block@1` constraint is recorded there. The
review log is deliberately blank: these questions cannot count as evidence
until an independent human reviewer accepts or rejects them without seeing the
evaluated surface.

**Provisional workflow dry run, not a gate result:** fresh disposable clones
at the three pinned commits confirmed that every expected document exists and
that the development workflow runs with no API key. An AI body-only pre-screen
and temporary source-faithful surface edits produced compatible held-out P@1
improvements in at least one retriever for all three corpora. The same AI
performed the pre-screen, each held-out set has only six probes, and no human
review log is filled. This validates the workflow, not the claim. Full record:
[`validation/phase3/provisional-ai-dry-run-2026-08-28.md`](validation/phase3/provisional-ai-dry-run-2026-08-28.md).

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

- [x] `src/retrievers/semantic.ts`: local embeddings, pinned model version,
      no API key, and lexical and semantic results reported separately
- [x] Detect direct probe leakage. Do not call lexical versus semantic
      divergence a stuffing detector: the first real embedding run disproved
      that assumption when both the honest retrieval index and the stuffed
      index scored 95% semantic P@1.
- [x] Require supplied queries or a capable host-agent generator. Any generated
      set is made from bodies with the index withheld, written to disk, and
      reviewed before it can drive a CI threshold. A fixture-tuned heuristic
      generator is explicitly rejected.
- [x] For every development miss, report the expected source, the wrong top result, whether
      the failure is lexical, semantic, or both, and the missing source-grounded
      vocabulary a maintainer can add to the navigation entry.
- [x] Separate diagnose and evaluate modes. Diagnose mode cannot drive a CI
      threshold and evaluate mode never emits edit suggestions. Hold back
      evaluation probes from any index rewrite. A tool that suggests an index
      from a question and scores the same question is training-set evaluation,
      not evidence.
- [x] Compare held-out runs directly and reject comparisons whose probes,
      document fingerprint, surface, extractor, retrievers, floor, or full-text
      reference changed.

**Evidence required before this phase counts as done:**

| required | how to check |
|---|---|
| `examples/stuffed-index` trips direct probe-leakage detection | automated test against questions copied into their expected entries |
| `examples/retrieval-index` does **not** trip leakage detection | false-positive check, same test file |
| Semantic retriever runs with no API key and does not crash the CLI | manual run with key unset |
| Semantic output improves an honest retrieval surface without claiming the stuffed surface stays flat | the measured result replaced the assumption |
| At least 20 host-agent-generated probes across 3 real corpora pass blind human review | **not yet met.** An agent-assisted fact-check (`validation/phase3/agent-review-2026-08-28.md`) verified all 36 candidate probes against the pinned source and found none factually wrong, unanswerable, or trivia — but that is a verification pass, not the human blind judgment this gate requires, and it does not fill the blind-review log. A human still has to do that review. |
| Miss output gives a maintainer a specific, source-grounded edit to try | manual use on 3 real misses, followed by rerun |
| Held-out probes do not regress after applying the suggested edit | suggestions are not scored only on the questions that produced them |

**Success criterion:** direct leakage is caught, honest retrieval is not, the
semantic run works without a key, and a maintainer can use the miss diagnosis
to improve held-out routing on real documentation.

**Implementation and product review, 2026-08-28:** the useful product is not a
score-only linter. A maintainer needs to select the surface and corpus, see the
exact failed route, make an evidence-backed edit, and verify it against locked
questions. Phase 3 now implements that loop through `--surface`, repeatable
`--include`, diagnose and evaluate modes, and guarded baseline comparison.

A discovery smoke test against public checkouts of OpenAI Codex (`5ed294d`),
NVIDIA NVCF (`6be3b8fe`), and Vercel AI (`0a0f271`) found five fixture-blind
failures before any scores were collected:

- duplicate basenames could fabricate entries for nested `AGENTS.md` files;
- a nested `app-server/README.md` reference could alias the root `README.md`;
- paths inside fenced examples could look like navigation links;
- broken or out-of-corpus Markdown symlinks could crash or escape discovery;
- whole-monorepo Markdown made the corpus definition meaningless without
  explicit scoping.

These now have regression tests. This smoke test is implementation evidence,
not Claim B or Claim C evidence. It did not use reviewed probes and does not
satisfy the remaining three-corpus Phase 3 gate.

**Resolved, 2026-08-28.** The clean consumer install found a packaging issue
that this repository's own audit hides: npm does not propagate a dependency's
`overrides` to whoever installs it, so a tarball consumer received vulnerable
`onnxruntime-node`, `adm-zip`, and `sharp` versions selected by
`@huggingface/transformers@4.2.0` — a real adm-zip DoS and inherited libvips
CVEs, not theoretical. `npm audit` inside this repo reported clean while a
packed-tarball install into a throwaway project reported 5 high-severity
findings; the two genuinely disagree, and only the second is what a real
installer sees.

Fix: `@huggingface/transformers` moved from `dependencies` to an optional
`peerDependencies` entry, and `src/retrievers/semantic.ts` now imports it
dynamically. `npm install nocontext` alone pulls none of that subtree and
audits clean, verified by packing a real tarball into `/tmp` and auditing
there, not by trusting this repo's own `npm audit`. Without the peer
dependency installed, `nocontext` still runs — lexical scoring only, with a
warning naming the missing package and the exact install command. Semantic
scoring becomes available the moment a consumer runs
`npm install @huggingface/transformers` themselves, at which point *their*
root `package.json` is what npm reads `overrides` from.

CI gained a `consumer-audit` job that packs a tarball and audits it in a
throwaway project on every push, specifically because this repo's own
`npm audit` cannot catch a regression here — see CONTRIBUTING.md, "The
optional semantic dependency", for the full record and the manual recheck
command.

**Kill/descope criterion:** if local semantic retrieval makes installation or
first-run cost unacceptable, make it an explicit optional mode. If generated
questions cannot pass blind review without a capable host agent, require
supplied questions in the CLI and let the eventual skill provide generation.
Do not ship weak questions to preserve a zero-config claim.

### Phase 4 — Prove the score predicts something real

**This is the phase that decides whether the project continues.** Everything
before it demonstrates a mechanism on a corpus built to show it. This is the
first test against reality, and it is explicitly allowed to fail.

**Build:**

- [ ] Write and commit the study protocol before collecting outcomes. Name the
      primary metric, minimum useful effect, access conditions, corpus-size
      strata, repeat count, grading rule, exclusions, and analysis method.
- [ ] Select 8–12 real public repositories using the criteria below. They must
      not be written by this project or selected because they look good or bad.
- [ ] For each repository, freeze the documents and construct 10–15 questions
      before either experimental index exists. A question may name more than
      one relevant document when the corpus has overlapping answers.
- [ ] Create paired navigation surfaces: the repository's as-is surface and a
      retrieval-oriented rewrite. Documents and questions stay byte-identical.
- [ ] Run `nocontext` on both surfaces. Report lexical and semantic P@1, MRR,
      Recall@k, floor, and ceiling separately. There is no blended score.
- [ ] Randomize question and surface assignment for an actual agent, repeat
      stochastic runs, and grade blind. Record source use, answer correctness,
      files opened, tool calls, tokens, and latency for every run.
- [ ] Estimate the within-repository treatment effect of the rewritten surface.
      Then run the cross-repository score correlation as secondary evidence.

**Repo selection criteria, fixed before outcomes:**

- Include both small and large corpora. Small, freely explorable corpora are
  the preregistered negative-control stratum, not grounds for exclusion.
- Cross free filesystem access with at least one constrained condition:
  rank-based retrieval, or an explicit token, tool-call, or latency budget.
- Record corpus size in files and tokens. The protocol must define the stratum
  boundaries before any outcome run is inspected.
- Use real, maintained documentation. Do not use a stub `AGENTS.md`, or choose
  a repository because its docs already look obviously bad or obviously good.

**Evidence required:**

| required | why it's the actual gate |
|---|---|
| Preregistered protocol committed before outcome collection | stops thresholds, exclusions, and endpoints moving after the result is visible |
| Paired treatment effect on grounding and exploration cost, with uncertainty | this is the causal test the old cross-repository correlation could not provide |
| Lexical and semantic predictor coefficients, reported separately | tests Claim B without inventing a blended `nocontext` score |
| Interaction by corpus size and access condition | measures the pilot boundary instead of filtering it away |
| Per-run raw data, questions, qrels, prompts, index variants, transcripts, and cost traces published | makes every disputed grade and score reproducible |
| Sensitivity check with a different question author, agent, and retriever | one configuration is an anecdote |

**Success criterion:** the preregistered paired analysis finds either better
grounding, or lower exploration cost without worse answer quality, in at least
one boundary condition, and the held-out predictive analysis points in the
same direction. The result must include uncertainty and raw data, not only a
positive point estimate.

**Kill criterion, stated explicitly so it isn't dodged later:** if the paired
intervention changes neither grounding nor exploration cost across the
preregistered conditions, **say so publicly, in `METHOD.md`, and stop building
distribution surfaces.** A routing score that predicts neither outcome is a
toy. If it changes cost but not grounding, position the product as an
efficiency diagnostic. If it changes grounding only under ranked or budgeted
access, position it as a retrieval-surface audit. Those branches are fixed now,
before Phase 4, rather than invented after seeing its result.

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
| Anti-gaming | direct leakage detection + held-out evaluation workflow | phase 3 — in progress |
| **The finding** | **published paired effect on grounding and exploration cost, plus predictive correlation** | **phase 4 — not started, the actual deliverable** |
| GitHub Action | fails a build when findability drops | phase 5 |
| MCP server | one config line, works in any MCP client | phase 5 |
| Agent skill | agents self-check corpora they write | phase 5 |

The finding in Phase 4 is the actual deliverable. Every surface in Phase 5 is
a way to act on it, and none of them are worth building if Phase 4 fails.

The pilot rules out "nocontext makes every agent smarter" as the claim. Phase
4 has to show whether navigation changes grounding, exploration cost, or
neither, and under which access conditions. Positioning in Phase 5 follows the
branch fixed in the Phase 4 kill criterion. It does not get rewritten after
the result.

## 8. Launch criteria

Do not announce anywhere until all of these hold:

- [ ] Phase 3 gate passes: the probe-leaked corpus is caught by an automated test
- [ ] **Phase 4 has run and produced a result**, positive or negative, with raw
      data published either way
- [ ] The Phase 4 result names the supported product boundary: grounding,
      efficiency, retrieval-surface audit, or a published null
- [ ] If Phase 4 supports a product claim: the tool runs on at least 10 more
      real public corpora beyond the validation set, without crashing
- [ ] `METHOD.md` includes limitations discovered during Phase 4, not just the
      ones anticipated before it ran
- [ ] A stranger, not the person who built this, can clone, run, and
      understand the output without asking a question
- [ ] The packed package installs with no high or critical production audit
      findings in a clean consumer project; repository-local overrides do not
      count

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
- Any change that lets `examples/stuffed-index` pass clean
- Measurement logic in a surface rather than in core
- `console.log` anywhere under `src/core/`
- Blending supplied and generated probes
- Calling anything a "finding" or "benchmark" before Phase 4 passes
- Changing the preregistered Claim B or Claim C success branch after Phase 4
  outcomes are visible instead of publishing the result

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
- What minimum change in grounding, tool calls, tokens, or latency is useful
  enough to justify a product? Phase 4 must preregister the threshold.
- How many repeated agent runs per question are enough to estimate stochastic
  variance without making the study unaffordable?
