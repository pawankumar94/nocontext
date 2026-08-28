# Contributing

The most valuable contribution to this project is a corpus that proves the
measurement wrong. Second is an argument that the methodology is unsound.
Code is third.

## Attacking the method

Read [`docs/METHOD.md`](docs/METHOD.md) first. It is written to be attacked and
it lists the five objections I already know about, with answers. An objection it
does not cover is worth an issue.

If you have a corpus where the score is obviously wrong, open a
[wrong score issue](.github/ISSUE_TEMPLATE/wrong-score.md) with the corpus
attached. Benchmarks get corrected in public, with the correction explained.

## Working on the code

```bash
npm ci
npm run build
npm test
```

Requires Node 22 and, for regenerating fixtures, Python 3. `npm ci` in this
repo installs `@huggingface/transformers` as a devDependency, so the full
test suite (including semantic retrieval) runs without an extra step.

## The optional semantic dependency

`@huggingface/transformers@4.2.0` is the current release and it declares
`onnxruntime-node@1.24.3` and `sharp@^0.34.5`, which pull in versions with
real, published advisories: an adm-zip denial-of-service via onnxruntime-node
([GHSA-xcpc-8h2w-3j85](https://github.com/advisories/GHSA-xcpc-8h2w-3j85),
crafted zip triggers a 4GB allocation) and inherited libvips CVEs via sharp
([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)).

This repository's `overrides` field patches both for local development, but
`overrides` in a published package's `package.json` only takes effect for the
project at the root of the install — npm does not propagate a dependency's own
overrides to whoever installs that dependency. A consumer running
`npm install nocontext` would silently inherit both vulnerable subtrees with
no way to know from `nocontext`'s own audit, which looks clean because it runs
at our root, not theirs.

So `@huggingface/transformers` is a `peerDependencies` entry marked
`optional` in `peerDependenciesMeta`, not a regular dependency, and
`src/retrievers/semantic.ts` imports it dynamically. `npm install nocontext`
alone pulls nothing from that subtree and audits clean — verified by packing a
real tarball and installing it into a throwaway project, not just running
`npm audit` inside this repo, since the two can disagree (they did, here).
Semantic scoring is available only after a consumer explicitly runs
`npm install @huggingface/transformers`, at which point *their* root
`package.json` is what npm reads `overrides` from, and they can pin the same
patched versions this repo uses if they choose to.

If you touch `semantic.ts` or `package.json`'s dependency fields, rerun this
check before merging — `npm audit` inside this repo does not catch a
regression here, only auditing a packed tarball in a separate project does:

```bash
npm pack --silent
mkdir -p /tmp/nocontext-audit && cd /tmp/nocontext-audit
npm init -y >/dev/null && npm install /path/to/nocontext-*.tgz
npm audit   # must report 0 vulnerabilities
```

## The examples are a controlled experiment

`examples/` holds four corpora with byte-identical documents and probes, varying
only the navigation surface. That control is the reason any comparison between
them means anything.

They are generated from `examples/source/` by `examples/build.py`. **Never edit
a variant in place.** Edit the source and rebuild. CI regenerates them and fails
if the committed tree has drifted, because drift would silently turn a
controlled comparison into an uncontrolled one.

`examples/stuffed-index` exists to cheat by copying probe questions into their
expected entries. It should score well and trip the direct probe-leakage
warning. If a change lets it pass clean, the change is wrong, whatever else it
improves.

## Things that will be rejected

Anything that reports a single headline number without its floor and ceiling.
A percentage on an unknown corpus size is a sales figure, not a measurement,
and `src/types.ts` is written so this does not compile.
