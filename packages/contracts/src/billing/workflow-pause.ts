import { z } from "zod";

export const BILLING_WORKFLOW_PAUSE_REASONS = {
  creditsRequired: "BILLING_CREDITS_REQUIRED",
} as const;

// Transport routing keys retain the established event contract spelling.
export const BILLING_WORKFLOW_PAUSE_SOURCES = {
  scanner: "command.scan.requested.v1",
  engineering: "event.technical-evidence.accepted.v1",
  interview: "command.assessment-interview.resume-agent.v1",
} as const;

export const billingWorkflowPauseSchema = z
  .object({
    assessmentId: z.string().uuid(),
    reservationId: z.string().uuid().optional(),
    dispatchKey: z.string().min(1).max(512),
    sourceEvent: z.enum(Object.values(BILLING_WORKFLOW_PAUSE_SOURCES)),
    payload: z.record(z.string(), z.json()),
  })
  .strict();

export type BillingWorkflowPauseRequest = z.infer<
  typeof billingWorkflowPauseSchema
>;
