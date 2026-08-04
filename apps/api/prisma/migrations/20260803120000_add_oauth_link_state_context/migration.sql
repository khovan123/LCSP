ALTER TABLE "AuthOAuthState"
ADD COLUMN "userId" TEXT,
ADD COLUMN "sessionId" TEXT;

CREATE INDEX "AuthOAuthState_userId_sessionId_idx"
ON "AuthOAuthState"("userId", "sessionId");
