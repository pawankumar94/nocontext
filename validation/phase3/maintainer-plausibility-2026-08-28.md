# Maintainer plausibility dogfood, 2026-08-28

Pawan, the project maintainer, reviewed plain-language paraphrases of all 36
candidate probes in this chat. He marked every question as something a real
developer, administrator, or contributor could reasonably ask.

| corpus | development | held-out | result |
|---|---:|---:|---|
| OpenAI Codex | 6 / 6 | 6 / 6 | all plausible |
| NVIDIA NVCF | 6 / 6 | 6 / 6 | all plausible |
| Vercel AI SDK | 6 / 6 | 6 / 6 | all plausible |

This is useful dogfooding evidence: the original generated questions could be
explained to a non-specialist without sounding fabricated or irrelevant.

It is not the blind source-document review required by the Phase 3 gate. The
maintainer reviewed paraphrases, not the pinned source documents themselves.
The agent-assisted fact check separately verifies direct source answers. The
per-probe human review record remains required before any question set is used
as Phase 3 evidence.
