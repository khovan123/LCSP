import type { Request } from "express";
import type { PbacRequestContext } from "../../platform/pbac/interfaces/pbac-request.interface.js";

type ExpressRoutePath = string | RegExp | Array<string | RegExp>;

type ExpressRoute = {
  path?: ExpressRoutePath;
};

export type AuthenticatedRequest = Omit<Request, "params" | "route"> & {
  pbacContext: PbacRequestContext;
  correlationId?: string;
  params: Record<string, string | undefined>;
  route?: ExpressRoute;
  user?: {
    id: string;
  };
};
