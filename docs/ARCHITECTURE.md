# Architecture

The tool has to reach a lot of places: a terminal, CI, an MCP server, an agent
skill, a hosted runner, eventually an editor. The shape below exists so each of
those is an adapter of a few dozen lines rather than a fork.

```
src/
├── core/          pure. no filesystem, no printing, no process, no network
│   ├── types.ts       contracts, including CorpusSource and Retriever
│   ├── analyze.ts     the one entry point every surface calls
│   ├── corpus/        documents and navigation surface
│   ├── probes/        question validation
│   ├── retrievers/    one file per implementation, one contract
│   └── scoring/       floor, observed, ceiling
├── retrievers/    I/O-backed implementations such as the local model loader
├── sources/       where documents come from. filesystem is one of several
├── report/        formatting. text, json
├── surfaces/      thin adapters. cli today, mcp and action next
└── index.ts       library API
```

## Three rules

**Core never does I/O.** It receives a `CorpusSource` and returns a `Run`. It
does not read files, print, exit, or throw for control flow. A surface decides
what to do with the result, including whether a bad score should fail a build.

**Documents arrive through an interface.** `CorpusSource` has `list`, `read`,
and an optional `indexPath`. A CLI walks a directory, an MCP server is handed
documents it already holds, a hosted runner pulls from a git provider, and a
browser has no filesystem at all. Binding core to `node:fs` would make each of
those a rewrite.

**One entry point.** Every surface calls `analyze(source, options)`. If a
surface ever needs to assemble the pipeline itself, that is a bug in the
signature, not a licence to duplicate it.

## Adding a surface

A surface builds a `CorpusSource`, calls `analyze`, and formats the `Run`. It
holds no measurement logic, because two surfaces that each compute a score will
eventually disagree, and the resulting bug is invisible: both numbers look
plausible.

`Run` is plain serializable data for the same reason. It crosses a process
boundary to an MCP client, a CI annotation, or a JSON file without conversion.

## Adding a retriever

Pure retrievers live in `core/retrievers/`. A retriever that loads a model,
calls a service, or touches a cache lives outside core and is injected through
`AnalyzeOptions`. `version` is on the interface so that a published score stays
interpretable after the retriever changes: results carry the version that
produced them. The CLI injects both BM25 and the pinned local semantic model.

Retrievers are reported side by side and never averaged. See `METHOD.md`, and
`CONTRIBUTING.md` for why a change that lets `examples/stuffed-index` pass clean
is wrong regardless of what else it improves.
