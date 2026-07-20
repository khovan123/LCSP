export interface FinalReportRequestDto {
  document_request_id: string;
  status: "QUEUED";
  document_type: "FinalReport";
  correlation_id: string;
}
