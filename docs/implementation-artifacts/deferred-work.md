# Deferred Work Ledger

## Deferred from: code review of 3-2-pin-commit-and-create-repositorysnapshot (2026-07-19)

- **Missing database foreign key constraints for RepositorySnapshot**: Plain string association is used to maintain architectural decoupling between modules.
- **Missing indexes on organizationId/actorId in RepositorySnapshot**: AssessmentId is the primary filter, so this is a minor database optimization.
- **Missing token caching for installation access tokens**: Token caching can be introduced in a future performance optimization epic.
- **Inconsistent audit logs when connection ID is missing**: Connection ID vs Assessment ID mismatch in `resourceId` during denial audit is minor.
- **Out-of-scope repository validation check is redundant in PinSnapshotHandler**: Redundant check is harmless.
