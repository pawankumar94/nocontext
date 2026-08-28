# PLANNER

Working document for anyone, human or agent, picking this project up. It is
written to be self-contained: you should not need the conversation that started
it.

Read [`docs/METHOD.md`](docs/METHOD.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
before writing code. This file says what we are building and in what order.
Those two say what must stay true while you build it.

---

## 1. What this is

`nocontext` measures whether an agent pointed at a folder of documentation can
actually **reach** the right document when someone asks a question.

Existing tools check whether documentation is *valid*: frontmatter present,
links resolve, dates fresh. None check whether it is *findable*. A corpus can
pass every linter in existence and still be unusable, and when it is, nothing
errors. The agent answers anyway, from parametric memory, with no source behind
it, and no log records that it happened.

We call that the **ungrounded rate**: the share of answerable questions where
the agent would have to answer without reaching its source.

## 2. The claim we are trying to earn

> An index that reads well to a person can route badly to an agent, and the
> failure is silent.

This is not hypothetical. On a small hand-built corpus, an index written the way
a person summarises ("what must be true before a production rollout") routed
5 of 12 questions correctly. Rewritten around the words people actually ask in,
it routed 12 of 12, for about 80 extra tokens.

The product is a number that makes that visible on anyone's corpus. **We do not
publish a headline number until the methodology survives attack.** That ordering
is the whole strategy and it is not negotiable.

## 3. Non-negotiables

Breaking any of these silently invalidates every number the tool produces.
If you think one is wrong, open an issue and argue it. Do not route around it.

### Measurement

- **Three numbers, never one.** Floor (random, `1/N`), observed, ceiling (full
  bodies available). A percentage without its floor is unreadable: 60% across
  3 documents is near chance, across 200 it is extraordinary. `Measurement`
  in `src/core/types.ts` has no field for a headline number, on purpose.
- **Probes never come from the index.** Generating questions from the navigation
  surface and testing that surface against them is circular and flatters every
  corpus. Probes come from document bodies with the index withheld, or from
  supplied query logs.
- **Two retrievers, never averaged.** A keyword-stuffed index scores high
  lexically and flat semantically. That divergence is the cheat detector.
  Reporting one alone destroys it.
- **Supplied and generated probes are never blended.** `Probe.origin` is on the
  type so this cannot happen by accident.

### Architecture

- **Core does no I/O.** No filesystem, no printing, no `process.exit`, no
  throwing for control flow. It takes a `CorpusSource`, returns a `Run`.
- **One entry point.** Every surface calls `analyze(source, options)`. A surface
  that assembles the pipeline itself is a bug in the signature, not a licence
  to duplicate.
- **Documents arrive through `CorpusSource`.** Two methods, `list` and `read`.
  The filesystem is one implementation. An MCP server is handed documents it
  already holds; a browser has no filesystem.
- **`Run` stays plain serializable data.** It crosses process boundaries.

### Fixtures

`examples/` is a controlled experiment: four corpora with byte-identical
documents and byte-identical probes, varying only the navigation surface.
Generated from `examples/source/` by `examples/build.py`.

- **Never edit a variant in place.** Edit source, run `npm run examples`.
- `examples/stuffed-index` exists to cheat. If a change lets it pass clean, the
  change is wrong regardless of what else it improves.

## 4. Current state

Done:

- `docs/METHOD.md`, published before any result exists
- `docs/ARCHITECTURE.md`
- Type contracts in `src/core/types.ts`
- Four example corpora + 19 hand-written probes
- Fixture-integrity tests (4, passing) and CI
- README, brand assets, MIT licence

Not started: every implementation file. They are stubs with contracts.

## 5. Build order

Do these in sequence. Each phase ends with something verifiable.

### Phase 1 — Make it measure something

- [ ] `src/sources/filesystem.ts` — `CorpusSource` over a directory. Markdown
      only for now. Skips `node_modules`, dotfiles, `README`.
- [ ] `src/core/corpus/` — parse documents into `Doc[]`; detect an index file
      (`index.md`, `README.md` at root, or OKF `index.md`) and build a
      `NavigationSurface`. No index means `kind: "implicit"` built from the
      file tree, labelled as such in all output.
- [ ] `src/core/retrievers/lexical.ts` — BM25. Deterministic, no network, no
      key. Set `version` and never change scoring without bumping it.
- [ ] `src/core/scoring/` — floor, observed, ceiling for one retriever.
- [ ] `src/core/analyze.ts` — wire it together.

**Verification gate.** Run all four example corpora. The prediction, recorded
publicly in the README before this code existed:

- `retrieval-index` observed ≫ `human-index` observed
- **all four report the same ceiling**, because the documents are byte-identical

If ceilings differ, there is a bug. Do not proceed past this gate by adjusting
the prediction.

### Phase 2 — Make it readable

- [ ] `src/report/text.ts` — the terminal block from the README
- [ ] `src/report/json.ts` — full run record: probes, retriever versions, floor,
      ceiling, per-probe outcomes. A disputed score must be resolvable by
      exchanging this file.
- [ ] `src/surfaces/cli.ts` — arg parsing, `--json`, `--questions`,
      `--emit-probes`. Exit codes: 0 always unless `--fail-under` is passed.

**Gate:** `npx . ./examples/human-index` prints something a stranger understands
without reading the docs.

### Phase 3 — Make it hard to fool

- [ ] `src/core/retrievers/semantic.ts` — embeddings. Optional, degrades
      cleanly when no key is present.
- [ ] Stuffing detection: warn when lexical leads semantic by a wide margin.
- [ ] `src/core/probes/` — generation from bodies, index withheld. Emit probes
      to disk on every run.

**Gate:** `examples/stuffed-index` trips the warning. `retrieval-index` does
not. This is the single most important test in the project.

### Phase 4 — Make the numbers defensible

- [ ] Run against real public corpora, not just fixtures
- [ ] Sensitivity checks: does the result hold with different probe counts,
      different probe authors, different retrievers?
- [ ] Write up limitations found in the process and fold them into `METHOD.md`
- [ ] Only now, publish a number

### Phase 5 — Make it reach people

- [ ] `action/` — GitHub Action, annotations on PRs, `--fail-under` gate
- [ ] `src/surfaces/mcp.ts` — MCP server. Claude Code, Codex, Cursor, Windsurf.
      A `CorpusSource` plus a formatter, nothing more.
- [ ] `skill/` — agent skill manifest so agents can check corpora they author
- [ ] Publish to npm so `npx nocontext` works

## 6. Deliverables

| surface | form | status |
|---|---|---|
| CLI | `npx nocontext ./docs` | phase 2 |
| Library | `import { analyze } from "nocontext"` | phase 1 |
| GitHub Action | fails a build when findability drops | phase 5 |
| MCP server | one config line, works in any MCP client | phase 5 |
| Agent skill | agents self-check corpora they write | phase 5 |
| The finding | a published, defensible number | phase 4 |

The finding is the actual deliverable. The tool is how people verify it.

## 7. Launch criteria

Do not announce anywhere until all of these hold:

- [ ] Phase 3 gate passes: the stuffed corpus is caught
- [ ] The tool runs on at least 10 real public corpora without crashing
- [ ] `METHOD.md` includes limitations discovered during phase 4, not just the
      ones anticipated at the start
- [ ] A stranger can clone, run, and understand the output without asking

The repo is public now on purpose: `METHOD.md` is timestamped in git before any
result exists, which is the strongest available answer to "you designed the
method to fit the number". Public is not the same as announced.

## 8. Verifying your work

```bash
npm ci
npm run typecheck
npm test
npm run examples && git diff --exit-code examples/   # fixtures must not drift
```

CI runs all of this. It also regenerates `examples/` and fails if the committed
tree has moved, because fixture drift voids the control without anything
appearing to break.

## 9. What gets rejected

- Any output path that reports a score without its floor and ceiling
- Any change that lets `examples/stuffed-index` pass clean
- Measurement logic in a surface rather than in core
- `console.log` anywhere under `src/core/`
- Blending supplied and generated probes
- A published number before phase 4 is complete

## 10. Open questions

Genuinely undecided. Argue for an answer in an issue rather than picking one
silently:

- How many probes per document is enough? Default is 5, chosen arbitrarily.
- Should the ceiling use the same retriever as observed, or the best available?
- For a corpus with no index, is the file tree the honest surface, or should
  `README.md` count as an index when one exists?
- Do we score a document that no probe targets, or is corpus coverage a
  separate metric?
