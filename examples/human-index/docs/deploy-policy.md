---
title: Deployment policy
---
# Deployment policy

Production releases go out behind a staged rollout. Five percent of traffic for
a minimum of thirty minutes, then full. The thirty minute figure is the observed
p95 time to detect across the two rollbacks we had in Q1.

Database migrations are applied and verified before the application deploy,
never in the same step. Reversing that order has broken production twice: the
application assumes the migrated schema on boot.

A named rollback owner stays online for the duration of the stage.

Sev-1 mitigation may skip the stage with an incident commander's approval.
