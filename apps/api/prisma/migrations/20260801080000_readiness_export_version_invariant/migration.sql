DROP INDEX IF EXISTS "ReadinessExport_assessmentId_version_idx";
CREATE UNIQUE INDEX "ReadinessExport_assessmentId_version_key"
ON "ReadinessExport"("assessmentId", "version");
