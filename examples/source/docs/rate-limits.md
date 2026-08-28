---
title: API rate limits
---
# API rate limits

The default ceiling is one thousand requests per minute per account, burst to
two thousand for sixty seconds.

Exceeding the ceiling returns 429 with a Retry-After header. Clients that ignore
Retry-After and retry immediately are throttled harder, to five hundred per
minute, for fifteen minutes.

Enterprise accounts negotiate their own ceiling. It is set per account, not per
tenant, so a noisy tenant can exhaust the whole account's budget.
