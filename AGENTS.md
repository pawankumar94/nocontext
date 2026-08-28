# AGENTS.md

Start with [`PLANNER.md`](PLANNER.md). It states what is being built, in what
order, and what must stay true while you build it.

Two documents constrain every change:

- [`docs/METHOD.md`](docs/METHOD.md) — the measurement, written to be attacked.
  The commitments in it are why any number this tool prints is worth anything.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — core does no I/O, one entry point every surface calls, documents arrive through an interface, why two surfaces can't each compute their own score, where a new retriever goes if it needs to load a model or call a service, how an MCP server hands the tool documents without a filesystem.

## Before you commit

```bash
npm ci && npm run typecheck && npm test
npm run examples && git diff --exit-code examples/
```

## Fastest ways to break this project silently

Each of these leaves the build green and every number wrong.

- Reporting a score without its floor and ceiling
- Averaging the lexical and semantic retrievers, which destroys the only
  detector for keyword-stuffed indexes
- Generating probe questions from the index, which is circular
- Editing a corpus under `examples/` in place instead of `examples/source/`
- Putting measurement logic in a surface, so two surfaces can disagree

`PLANNER.md` section 9 is the full list of what gets rejected.
