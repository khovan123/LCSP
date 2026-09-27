# Workflow Billing Pause

## Root Cause

Reservation exhaustion used to pass through the generic Planner fallback and
per-requirement Investigator exception handlers. One spend guard could therefore
produce runtime failures for every remaining requirement. A completed dispatch
could also leave activities open in stages it had visited before its final stage.

## Fix

- Billing exhaustion is a workflow control-flow sentinel, not an engineering
  finding. Root persists `WorkflowBillingPause` before returning normally to the
  broker. Callback persistence failure is not acknowledged as a successful pause.
- The customer adds funds and uses the existing Continue action. The API resolves
  the owner, checks funds, and atomically queues one canonical outbox command with
  a fresh billing envelope. The spent reservation is never copied into the replay.
- Source scan, engineering assessment, and Interview resume dispatches support
  this pause. An Interview dispatch that already accepted its answer and entered
  engineering resumes engineering directly, without submitting the answer again.
- Source scans retain their original job/snapshot and wait in
  `WAITING_FOR_CREDITS`. Terminal jobs cannot be revived by this path.
- Managed Investigator resumes the failed checkpoint node with `None` input.
  Completed READY results are reused only after validating their pinned rule,
  artifact versions, graph evidence, and confirmed customer statement references.
- Dispatch activity identity is `(runId, correlationId)`. Its outer terminal
  event closes every participating stage in that dispatch, never another turn.
  Billing pause is neutral waiting; genuine Investigator failures remain failed.

## Account Reservation Auto Refill

`BillingWallet.reservationAutoRefillEnabled` defaults to false. Opt-in accounts
can replenish a live reservation without a call-count limit. Each new claim holds
only its worst-case deficit from available wallet credits under the existing
user transaction lock. Invocation replay is idempotent; this does not mint funds,
bypass pricing/model authorization, or permit spend beyond the wallet balance.

Enable the policy for an existing authorized account with:

```sh
pnpm --dir apps/api exec cross-env DOTENV_CONFIG_PATH=../../.env tsx scripts/enable-reservation-auto-refill.ts account@example.com
```

The operator script writes the policy and audit record in one transaction and
does not alter wallet balances. Existing runtime processes must load the updated
worker/API code before they can enforce pause and refill behavior.
