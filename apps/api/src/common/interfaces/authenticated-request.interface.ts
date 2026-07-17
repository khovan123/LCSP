import type { Request } from "express";
import type { PbacRequestContext } from "../../platform/pbac/interfaces/pbac-request.interface.js";

export interface AuthenticatedRequest extends Request {
  pbacContext: PbacRequestContext;
  correlationId?: string;
  user?: {
    id: string;
  };
}
