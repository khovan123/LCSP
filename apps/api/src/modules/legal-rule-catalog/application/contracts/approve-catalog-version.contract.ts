export interface ApproveRuleCatalogVersionRequest {
  scopeDescription?: string;
}

export interface ApproveRuleCatalogVersionResponse {
  id: string;
  version: string;
  status: string;
  approvedAt: string | null;
}
