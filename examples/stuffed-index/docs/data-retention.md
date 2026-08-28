---
title: Data retention
---
# Data retention

Customer records are kept for seven years after contract termination, which is
a statutory requirement rather than a product decision.

Application logs are kept ninety days hot and one year cold. Traces are kept
fourteen days and are never archived, because they contain request payloads.

Deletion requests are honoured within thirty days across hot storage, cold
storage and backups. Backups are the slow part, since they expire on their own
schedule rather than being edited.
