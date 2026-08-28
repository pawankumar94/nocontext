---
title: Operations handbook
---
# Operations handbook

| Document | Covers |
|---|---|
| [Deployment policy](docs/deploy-policy.md) | Do migrations run before or after the app deploy? How long do we hold at 5% before going full? Can I skip the staged rollout during an outage? Who has to stay online while a release is going out? |
| [On-call rotation](docs/oncall.md) | What day does the pager change hands? If I'm secondary do I need to be at my desk? Can I swap a shift without asking anyone? |
| [Data retention](docs/data-retention.md) | How long do we keep customer data after they leave? Someone asked us to delete their data, how long do we have? Are traces backed up anywhere? |
| [API rate limits](docs/rate-limits.md) | Why am I getting 429s? What happens if I keep retrying immediately? Is the quota per tenant or for the whole account? |
| [Incident severity](docs/incident-severity.md) | Does a degraded service page anyone at 3am? Can we downgrade an incident once it's open? Is data loss automatically the highest severity? |
| [Billing and invoicing](docs/billing.md) | When do invoices go out and when are they due? What happens if I go over my allowance on the free plan? Do I get money back if I downgrade halfway through the year? |
