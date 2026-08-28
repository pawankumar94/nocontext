---
name: This corpus gets a wrong answer
about: nocontext scored a corpus in a way you can show is wrong
labels: methodology
---

This is the most useful issue you can open, and corrections are made in public.

**The corpus**
Attach it, or link it, or paste enough to reproduce. Small is better.

**What nocontext reported**
Paste the output of `nocontext <path> --json`.

**What you expected, and why**
The important part. What should the score have been, and what makes you
confident?

**Which number is wrong**
- [ ] observed is too low, the index does expose this
- [ ] observed is too high, the index does not really expose this
- [ ] the ceiling is wrong, the corpus does not contain the answer
- [ ] a stuffing warning fired on an honest index
- [ ] no stuffing warning fired on a gamed index
- [ ] something else
