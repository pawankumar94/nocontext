# Agent-assisted pre-review, 2026-08-28

**This is not the human blind review `README.md` requires, and does not
satisfy that gate.** The protocol calls for a human reviewer, and its own
blind-review log says plainly: "Do not edit this log to imply review
occurred." Editing that table from an agent session would be exactly the kind
of fabricated progress this project exists to catch in other people's work.
So this is recorded separately, clearly labeled, and the official log below
stays empty until a human actually does it.

What this is: I cloned all three repos at their pinned commits and checked
every one of the 36 candidate probes against the real document text, without
opening any navigation surface (`README.md`, `docs/user/index.md`, or
`AGENTS.md`) first, matching the protocol's blindness requirement even though
I'm not the reviewer the protocol asks for.

## Result: 36/36 accept, 0 reject

Every probe has a direct, locatable answer in its named document. None are
heading lookups, trivia, or ambiguous. Spot-checked citations below; full
grep trail is reproducible against the pinned commits in
`validation/phase3/README.md`.

### Codex (12/12)

- "avoid `--all-features`" → docs/install.md: "Avoid `--all-features` for
  routine local runs because it increases build time..."
- "plaintext TUI log" → docs/install.md: "Set `log_dir` explicitly to enable
  a plaintext TUI log for a run."
- "format and apply fixes" → docs/install.md: `just fmt`, `just fix -p <crate>`
- "helper tool... project-specific tests" → docs/install.md: `cargo-nextest`,
  "`just test` runs the test suite via nextest"
- "minimum supported memory" → docs/install.md: "RAM 4-GB minimum (8-GB
  recommended)"
- "non-interactive runs... diagnostic messages" → docs/install.md: "`codex
  exec` defaults to `RUST_LOG=error`, but messages are printed inline"
- "DotSlash... source control" → docs/install.md: "make a lightweight commit
  to source control to ensure all contributors use the same version"
- "Windows development" → docs/install.md: "Windows 11 via WSL2"
- "environment variable... Rust logging" → docs/install.md: `RUST_LOG`
- "stop local hook settings... still allow managed hooks" → docs/config.md:
  "`allow_managed_hooks_only = true` in `requirements.toml`... while still
  allowing managed hooks"
- "where must the managed-hooks-only setting be defined" → docs/config.md:
  "only supported in `requirements.toml`; putting it in `config.toml` does
  not enable managed-hooks-only mode"

**One thing worth a human's judgment, not a rejection:** the development
probe "which helper tool is installed to run project-specific tests" and the
held-out probe "which test runner does the general test helper use" both
resolve to `nextest`. They're not identical questions, but they're close
enough in the same fact that a maintainer fixing the index for one could
accidentally fix the other too, which would inflate an apparent held-out
improvement without testing anything new. The protocol doesn't list
cross-split redundancy as a rejection criterion, so I accepted both, but a
human reviewer should decide whether to swap the held-out one for a probe on
an unrelated fact in docs/install.md before this pair is used to claim
generalization.

### NVIDIA NVCF (12/12)

- "unsupported internal registry... configuration path" →
  docs/user/registry-allowlist.md, the entire guide
- "make the API process pick them up" → registry-allowlist.md: "a rollout is
  required for env changes to take effect" (Step 2)
- "confirm... applied when the API container has no shell" →
  registry-allowlist.md: "Use `helm get values` because the API container has
  no shell" (Step 3)
- "image existence checks... during function creation" → registry-allowlist.md:
  "the NVCF API will not pre-validate that the image exists at
  function-create time" (No)
- "custom registry allowlist... Helm-chart function images" →
  registry-allowlist.md: "Allowlisting registries for Helm-chart functions is
  not supported today" (No)
- "deployment rule... autoscaled instances... different container images" →
  docs/user/function-creation.md: pin versions, not `latest`, or "this can
  lead to undefined behavior"
- "API keys instead of environment variables" → function-creation.md: "Use
  Kubernetes Secrets... instead of environment variables"
- "existing function version... updated to point at a new container image" →
  function-creation.md: "Function versions created are immutable" (No)
- "container-user requirement" → function-creation.md: "Do not run containers
  as root user... specify a non-root user"
- "orchestration across several containers" → function-creation.md: "Helm
  Chart... Enables orchestration across multiple containers"
- "Helm-chart function... wrong choice... streaming responses" →
  function-creation.md: Helm Chart "Does not support... streaming-based
  invocation"
- "restarting an NVCF service... rollout completed" →
  docs/user/control-plane-operations.md, "Restarting a Service" section,
  explicit `nvcf-api` example

### Vercel AI SDK (12/12)

- "attacker-controlled URL... validation setting" →
  contributing/secure-url-handling.md: `validateUrl: true`
- "response URL... points back to a configured private self-hosted endpoint" →
  secure-url-handling.md: `trustedOrigin`
- "URL built only from a configured base endpoint" → secure-url-handling.md:
  `validateUrl: false`
- "CI if a provider calls getFromApi without an explicit decision" →
  secure-url-handling.md: the `ai-sdk/require-validate-url` oxlint rule,
  "`pnpm check` fails"
- "trustedOrigin... developer configuration rather than a provider response" →
  secure-url-handling.md: "must always be a developer-configured value —
  never derive it from response data," with the same-origin reasoning given
- "test coverage... manually for a new text-generation feature" →
  contributing/testing.md: the three-case list (`generateText`, `streamText`,
  UI follow-up)
- "provider-response fixtures... live in a package" → testing.md: the
  `__fixtures__` subfolder convention
- "embedding response fixture... too large to store in full" → testing.md:
  "Trim them to a few values per vector (e.g. 5)"
- "provider response fixtures... unmodified response too large to commit" →
  testing.md: "some cutting that does not change semantics is advised"
- "extra option and helper... saving a streaming response fixture" →
  testing.md: `includeRawChunks: true` and `saveRawChunks`
- "format... OpenAI-style saved stream chunks" → testing.md: SSE `data: `
  prefix with a `[DONE]` sentinel
- "release mechanism... record package changes before the regular release
  process" → contributing/releases.md: changesets

## What this does and doesn't establish

It substantially de-risks the human review: every probe is real, grounded,
and well-formed, so a human reviewer is very unlikely to find factual
problems. It does not satisfy the Phase 3 evidence requirement, which is
specifically a human, blind, independent judgment call — not a
fact-verification pass, and not one an agent that could itself generate
probes should certify. Someone still has to sit down, read each question
without the navigation surface, and fill the log in `README.md` themselves.
