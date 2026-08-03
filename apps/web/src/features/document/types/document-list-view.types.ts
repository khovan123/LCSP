import type {
  DocumentRequestStatus,
  DocumentType,
} from "@lcsp/contracts/document";

export type DocumentListItem = {
  document_request_id: string;
  document_type: DocumentType;
  status: DocumentRequestStatus;
  blocked_reason: string | null;
  download_url: string | null;
  download_url_expires_at: string | null;
  requested_at: string;
};

export type DocumentListViewProps = {
  assessmentId: string;
  documents: DocumentListItem[];
  canDownloadFinalReport: boolean;
};
