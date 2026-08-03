"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download } from "lucide-react";
import type { DocumentRequestStatus, DocumentType } from "@lcsp/contracts/document";
import { DOCUMENT_REQUEST_STATUSES, DOCUMENT_TYPES } from "@lcsp/contracts/document";
import { resolveMessage, type MessageKey } from "@lcsp/i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getDocumentStatus } from "@/lib/api/document-client";
import { appLocale } from "@/lib/locale";

type DocumentStatusCardProps = {
  assessmentId: string;
  documentRequestId: string;
  documentType: DocumentType;
  initialStatus: DocumentRequestStatus;
  initialBlockedReason: string | null;
  initialDownloadUrl: string | null;
  initialDownloadExpiresAt: string | null;
  initialRequestedAt: string;
  canDownload: boolean;
};

function getLabelKey(documentType: DocumentType): MessageKey {
  switch (documentType) {
    case DOCUMENT_TYPES.finalReport:
      return "pages.classification.documentTypes.finalReport";
    case DOCUMENT_TYPES.gapAnalysis:
      return "pages.classification.documentTypes.gapAnalysis";
    case DOCUMENT_TYPES.readinessExport:
      return "pages.classification.documentTypes.readinessExport";
    default:
      return "pages.classification.documentTypes.unknown";
  }
}

function getStatusLabelKey(status: DocumentRequestStatus): MessageKey {
  switch (status) {
    case DOCUMENT_REQUEST_STATUSES.queued:
      return "pages.classification.documentStates.queued";
    case DOCUMENT_REQUEST_STATUSES.generating:
      return "pages.classification.documentStates.generating";
    case DOCUMENT_REQUEST_STATUSES.ready:
      return "pages.classification.documentStates.ready";
    case DOCUMENT_REQUEST_STATUSES.failed:
      return "pages.classification.documentStates.failed";
    case DOCUMENT_REQUEST_STATUSES.blocked:
      return "pages.classification.documentStates.blocked";
    default:
      return "pages.classification.documentStates.unknown";
  }
}

export function DocumentStatusCard({
  assessmentId,
  documentRequestId,
  documentType,
  initialStatus,
  initialBlockedReason,
  initialDownloadUrl,
  initialDownloadExpiresAt,
  initialRequestedAt,
  canDownload,
}: DocumentStatusCardProps) {
  const [status, setStatus] = useState<DocumentRequestStatus>(initialStatus);
  const [blockedReason, setBlockedReason] = useState(initialBlockedReason);
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl);
  const [downloadExpiresAt, setDownloadExpiresAt] = useState(initialDownloadExpiresAt);
  const [isPolling, setIsPolling] = useState(
    initialStatus === DOCUMENT_REQUEST_STATUSES.queued ||
      initialStatus === DOCUMENT_REQUEST_STATUSES.generating,
  );

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const outcome = await getDocumentStatus(assessmentId, documentRequestId);
      if (outcome.kind === "loaded") {
        const nextStatus = outcome.data.status;
        setStatus(nextStatus);
        setBlockedReason(outcome.data.blocked_reason);
        setDownloadUrl(outcome.data.download_url);
        setDownloadExpiresAt(outcome.data.download_url_expires_at);
        if (
          nextStatus === DOCUMENT_REQUEST_STATUSES.ready ||
          nextStatus === DOCUMENT_REQUEST_STATUSES.failed ||
          nextStatus === DOCUMENT_REQUEST_STATUSES.blocked
        ) {
          setIsPolling(false);
        }
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [assessmentId, documentRequestId, isPolling]);

  const shouldShowSpinner = useMemo(
    () => status === DOCUMENT_REQUEST_STATUSES.queued || status === DOCUMENT_REQUEST_STATUSES.generating,
    [status],
  );

  const showDownloadButton = useMemo(
    () => status === DOCUMENT_REQUEST_STATUSES.ready && Boolean(downloadUrl) && canDownload,
    [canDownload, downloadUrl, status],
  );

  const statusMessageKey = getStatusLabelKey(status);
  const labelKey = getLabelKey(documentType);

  async function onDownload() {
    if (!downloadUrl) {
      return;
    }

    const now = Date.now();
    const expiresAt = downloadExpiresAt ? Date.parse(downloadExpiresAt) : Number.NaN;
    if (Number.isFinite(expiresAt) && expiresAt - now <= 60_000) {
      const refreshed = await getDocumentStatus(assessmentId, documentRequestId);
      if (refreshed.kind === "loaded") {
        setDownloadUrl(refreshed.data.download_url);
        setDownloadExpiresAt(refreshed.data.download_url_expires_at);
        if (!refreshed.data.download_url) {
          return;
        }
        window.open(refreshed.data.download_url, "_blank", "noopener,noreferrer");
        return;
      }
    }

    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{resolveMessage(appLocale, labelKey)}</CardTitle>
            <CardDescription className="mt-1">
              {resolveMessage(appLocale, "pages.classification.documentMeta.requestedAt")} {initialRequestedAt}
            </CardDescription>
          </div>
          <Badge
            variant={
              status === DOCUMENT_REQUEST_STATUSES.failed
                ? "destructive"
                : "secondary"
            }
          >
            {resolveMessage(appLocale, statusMessageKey)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {shouldShowSpinner ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <span>{resolveMessage(appLocale, statusMessageKey)}</span>
          </div>
        ) : null}

        {status === DOCUMENT_REQUEST_STATUSES.failed ? (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4" />
            <span>{resolveMessage(appLocale, "pages.classification.documentStates.failedDetail")}</span>
          </div>
        ) : null}

        {status === DOCUMENT_REQUEST_STATUSES.blocked && blockedReason ? (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle className="size-4" />
            <span>{blockedReason}</span>
          </div>
        ) : null}

        {!canDownload && status === DOCUMENT_REQUEST_STATUSES.ready ? (
          <div className="text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.documentStates.permissionDenied")}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {showDownloadButton ? (
          <Button
            type="button"
            className="inline-flex items-center gap-2"
            onClick={onDownload}
          >
            <Download className="size-4" />
            {resolveMessage(appLocale, "pages.classification.documentActions.download")}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
