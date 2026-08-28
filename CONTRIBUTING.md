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

Requires Node 22 and, for regenerating fixtures, Python 3.

## The examples are a controlled experiment

`examples/` holds four corpora with byte-identical documents and probes, varying
only the navigation surface. That control is the reason any comparison between
them means anything.

They are generated from `examples/source/` by `examples/build.py`. **Never edit
a variant in place.** Edit the source and rebuild. CI regenerates them and fails
if the committed tree has drifted, because drift would silently turn a
controlled comparison into an uncontrolled one.

`examples/stuffed-index` exists to cheat. It should score well lexically, flat
semantically, and trip a stuffing warning. If a change lets it pass clean, the
change is wrong, whatever else it improves.

## Things that will be rejected

Anything that reports a single headline number without its floor and ceiling.
A percentage on an unknown corpus size is a sales figure, not a measurement,
and `src/types.ts` is written so this does not compile.
