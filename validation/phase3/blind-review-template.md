# Phase 3 blind-review record template

Copy this file to `blind-review-YYYY-MM-DD-<reviewer>.md` before filling it.
Do not edit this template or the aggregate log in `README.md` to imply a review
occurred.

For each candidate JSON file, inspect each question and expected document in a
checkout at the pinned commit. Do not open the selected navigation surface, run
`nocontext`, or read diagnosis output until every decision is final.

Accept a question only if it is plausible during real work, directly answered
by its expected document, and neither trivia nor a heading lookup. Use the
one-based probe number in each JSON file. Record every rejected number and its
reason; an empty rejected cell means no questions were rejected.

- Reviewer:
- Date:
- Source checkouts verified at the commits in [`README.md`](README.md):

| corpus | file | accepted probe numbers | rejected probe numbers and reasons |
|---|---|---|---|
| Codex | development |  |  |
| Codex | held-out |  |  |
| NVCF | development |  |  |
| NVCF | held-out |  |  |
| Vercel AI SDK | development |  |  |
| Vercel AI SDK | held-out |  |  |

After review, copy the accepted and rejected counts to the aggregate log in
`README.md`. Do not inspect held-out retrieval outcomes until the navigation
surface rewrite is complete.
