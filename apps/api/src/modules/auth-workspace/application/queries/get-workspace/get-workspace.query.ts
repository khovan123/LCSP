import type { WorkspaceRequest } from "../../contracts/auth-workspace/workspace.contract.ts";

export class GetWorkspaceQuery {
  readonly request: WorkspaceRequest;

  constructor(request: WorkspaceRequest = {}) {
    this.request = request;
  }
}
