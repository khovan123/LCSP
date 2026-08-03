export const DOCUMENT_REQUEST_PANEL_STATUSES = {
  idle: "idle",
  loading: "loading",
  done: "done",
  error: "error",
} as const;

export type DocumentRequestPanelStatus =
  (typeof DOCUMENT_REQUEST_PANEL_STATUSES)[keyof typeof DOCUMENT_REQUEST_PANEL_STATUSES];

export type DocumentRequestPanelProps = {
  assessmentId: string;
};
