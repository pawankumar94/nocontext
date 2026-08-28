# Phase 3 review packet

This packet is the remaining evidence work for Phase 3. It contains 36
candidate probes: six development and six held-out questions for each corpus.
It is deliberately not a benchmark result and does not make Phase 3 pass by
itself.

## Fixed corpora

| corpus | source commit | intended surface | intended document scope |
|---|---|---|---|
| OpenAI Codex | `5ed294d49d64f79b25ae63cd1cdaf54db7a797fd` | root `README.md` | `docs/` |
| NVIDIA NVCF | `6be3b8fe56d6faaf1823d195698944ae8df9a68e` | `docs/user/index.md` | `docs/user/` |
| Vercel AI SDK | `0a0f271cff061e1ca953ed9d14ed7d525613a4a9` | root `AGENTS.md` | `contributing/`, `architecture/` |

The source repositories remain outside this repository. Clone each at its
listed commit before scoring. Do not change documents, probes, or corpus scope
between the before and after runs.

## Review protocol

Each JSON file was generated from the named document bodies. The navigation
surface was excluded from question authoring. A reviewer must inspect each
question and its expected document without seeing the navigation surface, then
record an accept or reject decision in a copy of
[`blind-review-template.md`](blind-review-template.md). The per-probe record
is the audit trail; the aggregate review log below is only a summary.

Accept only a question that is plausible during real work, has a direct answer
in every document named by `expect`, and is not merely a heading lookup,
trivia, or an ambiguous request. Reject otherwise. At least 20 accepted
questions across the three corpora are required before this packet becomes
Phase 3 evidence.

Before scoring, classify every accepted probe as either a **coverage** probe,
where the selected surface should link the gold document but does not, or a
**vocabulary** probe, where the pointer exists but does not route the question.
Do not combine those conditions into one unsupported claim. The current runs
use `pointer-block@1`; do not compare them to older `link-line@1` output.
Use [`classification-template.md`](classification-template.md) for this step,
after blind review is complete and before editing the surface.

Keep `development.json` and `held-out.json` separate. Use only development
questions with `--diagnose`. Do not inspect held-out misses until the navigation
surface rewrite is complete.

## Commands

Run from a clone of this repository after building it. Replace `<repo>` with a
separate checkout at the pinned commit and use the matching packet file.

```bash
node dist/surfaces/cli.js <repo> --surface <surface-from-table> --include <scope-from-table> \
  --questions validation/phase3/<corpus>/development.json --diagnose

node dist/surfaces/cli.js <repo> --surface <surface-from-table> --include <scope-from-table> \
  --questions validation/phase3/<corpus>/held-out.json --evaluate --json > before.json
```

For Vercel, repeat `--include contributing --include architecture`. Save the
resulting JSON beside a dated, local experiment record;
do not commit an edited copy of a third-party corpus here.

## Agent-assisted pre-review

An agent fact-checked all 36 probes against the pinned source commits and
found none factually wrong, unanswerable, or trivia. Full record:
[`agent-review-2026-08-28.md`](agent-review-2026-08-28.md). **This is not the
review this packet requires**. It is a verification pass, not the human
blind judgment below, and it does not substitute for filling this log.

## Maintainer plausibility dogfood

The project maintainer marked plain-language paraphrases of all 36 candidates
as plausible real-work questions. Full record:
[`maintainer-plausibility-2026-08-28.md`](maintainer-plausibility-2026-08-28.md).
This is a usability check, not the required blind source-document review.

## Blind-review log

| corpus | file | accepted | rejected | reviewer | date |
|---|---|---:|---:|---|---|
| Codex | development |  |  |  |  |
| Codex | held-out |  |  |  |  |
| NVCF | development |  |  |  |  |
| NVCF | held-out |  |  |  |  |
| Vercel AI SDK | development |  |  |  |  |
| Vercel AI SDK | held-out |  |  |  |  |

Do not edit this log to imply review occurred. It is complete only when a
human reviewer fills it from a blind review.
