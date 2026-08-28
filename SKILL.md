---
name: nocontext
description: Check whether AGENTS.md, CLAUDE.md, or a docs index actually routes real questions to the right file, and propose a source-backed fix. Use when someone asks to check, audit, lint, or improve their instruction files or documentation, when someone asks why an agent isn't using a doc that already answers something, or proactively after editing AGENTS.md, CLAUDE.md, or a docs index in a project that has one.
allowed-tools: Bash, Read
---

# nocontext

`nocontext` measures whether a navigation surface (`AGENTS.md`, `CLAUDE.md`,
`README.md`, or a docs index) routes a real question to the document that
answers it. It does **not** claim that fixing this makes an agent smarter —
that causal question is open and unproven; see `docs/METHOD.md` in the
[nocontext repo](https://github.com/pawankumar94/nocontext) if asked. Treat
every result as a routing check, not a validated predictor of agent
performance.

**You have an LLM. Use it to write real questions, not the tool's mechanical
fallback.** The CLI's bare `nocontext .` mode exists for a human with no
agent available, and it generates weak, mechanical probes from doc headings
as a last resort. You can do better: read the document bodies yourself and
write questions the way a contributor actually asks, which is exactly what
the CLI's `--questions` flag and `docs/PROBES.md` are built for. Do this
instead of relying on the bare zero-config path.

## When to use this

- Someone asks to check, audit, or improve how their `AGENTS.md` / `CLAUDE.md`
  / docs route questions.
- Someone asks why an agent didn't use a document that clearly answers
  something asked of it.
- **Proactively**, after you edit `AGENTS.md`, `CLAUDE.md`, or a docs index in
  a project that has one — a quiet check, only worth surfacing if it finds a
  concrete miss. Don't run this after every unrelated edit; only after
  changes to the navigation surface itself or the documents it points to.

Not for judging whether documentation is *accurate* or *complete* — only
whether a real question routes to the right file. Correct content can still
score badly if its navigation entry doesn't share vocabulary with how people
actually ask.

## The workflow

**1. Set up the tool**, once per session:

```bash
git clone https://github.com/pawankumar94/nocontext /tmp/nocontext
cd /tmp/nocontext && npm ci && npm run build
```

Reuse a prior clone if one exists on this machine. Semantic scoring
(`minilm-l6-v2`) is optional (`npm install @huggingface/transformers` in that
clone); skip it and lexical-only (`bm25`) still runs, which is enough for a
quick check.

**2. Read the document bodies the surface is meant to cover — never the
surface itself yet.** Generating questions from the navigation surface and
then testing that surface against them is circular; it flatters every
corpus. Look only at the actual `.md` files under the scope you're checking.

**3. Write 6–15 real questions**, the way a contributor actually asks, not
the way the document phrases itself:

```json
{
  "origin": "generated",
  "probes": [
    { "question": "Do migrations run before or after the deploy?", "expect": "docs/deploy-policy.md" }
  ]
}
```

Keep only questions with a direct, unambiguous answer in the named document.
Drop heading lookups and trivia. Write this to a temp file, e.g.
`/tmp/probes.json`.

**4. Run diagnose**, which shows vocabulary gaps without treating anything as
a held-out score:

```bash
node /tmp/nocontext/dist/surfaces/cli.js <path-to-repo> \
  --include docs \
  --questions /tmp/probes.json \
  --diagnose
```

Omit `--surface` to auto-detect (`AGENTS.md` → `CLAUDE.md` → `index.md` →
`README.md`). Always set `--include` explicitly on anything larger than a
handful of files, or the full-text reference becomes meaningless.

**5. Translate the output for the user. Do not show them the raw CLI
output.** They should never see `P@1`, `MRR`, floor/ceiling, or retriever
names unless they specifically ask for the underlying numbers. Report it the
way the tool's own miss list already frames it — a hit, a gold document, and
the words to add:

> `AGENTS.md` doesn't point to `docs/deploy-policy.md`, which covers
> migration ordering. A question about that currently routes to `README.md`
> instead. Add "migrations" and "deploy order" to the `AGENTS.md` entry for
> that doc — want me to?

If nothing was found, say so briefly and move on; don't manufacture a finding
to justify having run the check.

**6. If you edit the surface to fix it**, keep the questions you diagnosed
with separate from any you'd use to confirm the fix. Scoring an index against
the same questions used to build it is training-set evaluation, not evidence
the fix generalizes. If the user wants a defensible before/after number (for
a PR description, for CI), that's `--evaluate` with a held-out set and
`--baseline` against a prior `--json` run — see `docs/PROBES.md` — and it's
fine to walk them through that explicitly, since at that point they've asked
for the score, not just the fix.

## What not to claim

Never tell a user that a `nocontext` result means their agent will
hallucinate less, ground more answers, or perform better in production. That
correlation is an open research question this project hasn't answered yet.
The honest claim is narrower: *this navigation surface does or doesn't route
this question to the document that answers it.*
