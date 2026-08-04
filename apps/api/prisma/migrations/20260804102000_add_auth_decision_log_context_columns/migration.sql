ALTER TABLE "AuthDecisionLog"
ADD COLUMN IF NOT EXISTS "actorId" TEXT,
ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

CREATE INDEX IF NOT EXISTS "AuthDecisionLog_actorId_idx"
ON "AuthDecisionLog"("actorId");
