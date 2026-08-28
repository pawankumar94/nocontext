# Probe workflow

A `nocontext` score is only as useful as its questions. Use real questions from
support threads, issue discussions, search logs, or contributor interviews when
you have them. When you do not, a capable host agent can draft probes from the
document bodies under the constraints below.

## File format

```json
{
  "origin": "supplied",
  "probes": [
    {
      "question": "Do database migrations run before the app deploy?",
      "expect": "docs/deploy-policy.md"
    },
    {
      "question": "Where are release and rollback rules documented?",
      "expect": ["docs/deploy-policy.md", "docs/recovery.md"]
    }
  ]
}
```

`origin` is `supplied`, `generated`, or `fixture`. One file must contain one
origin. `expect` accepts one document or several valid documents when the corpus
contains overlapping answers.

## Generate without circularity

Give the host agent the document bodies and paths, but do not give it the
navigation surface being scored. Ask it to:

1. Write questions a contributor would plausibly ask while doing work.
2. Use natural task vocabulary, not headings copied from the source.
3. Keep only questions that the named document answers directly.
4. Remove duplicates, trivia, title lookups, and questions with ambiguous gold
   documents unless every valid document is listed in `expect`.
5. Save the result as JSON and set `origin` to `generated`.

A human reviewer should read each question without seeing the navigation
surface and reject anything implausible, ambiguous, or unsupported by its gold
document. A generated set that was not reviewed is development material, not
benchmark evidence.

## Keep development and evaluation separate

Create two reviewed files before changing the navigation surface. Use the
development file to understand misses and the held-out file only to score the
unchanged and revised surfaces.

Scope large repositories to the documentation the surface is expected to
navigate. Repeat `--include` for each document file or directory. This keeps
package changelogs, generated notes, and unrelated subtree instructions out of
the floor and ceiling.

```bash
nocontext . --surface AGENTS.md --include docs --include CONTRIBUTING.md \
  --questions probes-development.json --diagnose

nocontext . --surface AGENTS.md --include docs --include CONTRIBUTING.md \
  --questions probes-held-out.json --evaluate --json > before.json

# Revise AGENTS.md using development findings, not held-out misses.

nocontext . --surface AGENTS.md --include docs --include CONTRIBUTING.md \
  --questions probes-held-out.json --evaluate --baseline before.json
```

Diagnose mode reports terms that occur in both the question and the expected
source but not in that source's navigation entry. Those are edit candidates,
not automatic rewrites. Evaluate mode never emits those candidates, and
`--fail-under` is rejected in diagnose mode.

The baseline comparison refuses runs with different probes, document
fingerprints, surface identities, retriever versions, floors, or ceilings. Record both raw
evaluation runs when publishing results. An improvement on development
questions alone is training-set fit, not evidence that navigation improved.
