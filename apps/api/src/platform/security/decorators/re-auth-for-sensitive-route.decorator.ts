import { SetMetadata } from "@nestjs/common";
import { registerSensitiveRoute } from "../sensitive-route-policy.js";

export const RE_AUTH_FOR_SENSITIVE_ROUTE_METADATA_KEY =
  "lcsp:security:re-auth-for-sensitive-route";

export type SensitiveRouteAlias = {
  method: string;
  pathTemplate: string;
};

export type ReAuthForSensitiveRouteOptions = {
  routeId: string;
  method: string;
  pathTemplate: string;
  aliases?: readonly SensitiveRouteAlias[];
};

export const ReAuthForSensitiveRoute = (
  options: ReAuthForSensitiveRouteOptions,
): MethodDecorator & ClassDecorator => {
  registerSensitiveRoute({
    routeId: options.routeId,
    method: options.method,
    pathTemplate: options.pathTemplate,
  });

  for (const alias of options.aliases ?? []) {
    registerSensitiveRoute({
      routeId: options.routeId,
      method: alias.method,
      pathTemplate: alias.pathTemplate,
    });
  }

  return SetMetadata(RE_AUTH_FOR_SENSITIVE_ROUTE_METADATA_KEY, true);
};
