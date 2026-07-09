-- DropIndex
DROP INDEX "AuthAuditEvent_organizationId_idx";

-- CreateIndex
CREATE INDEX "AuthAuditEvent_organizationId_createdAt_idx" ON "AuthAuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_actorId_createdAt_idx" ON "AuthAuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_eventType_createdAt_idx" ON "AuthAuditEvent"("eventType", "createdAt");
