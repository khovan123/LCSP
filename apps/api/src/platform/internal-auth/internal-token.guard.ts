import * as crypto from "node:crypto";

import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { problemException } from "../problems/problem-factory.js";

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const provided = request.headers["x-internal-token"];
    const token = Array.isArray(provided) ? provided[0] : provided;
    const correlationId =
      headerString(request.headers["x-correlation-id"]) ?? crypto.randomUUID();

    const expected = this.configService.get<string>("internal.apiToken", "");

    if (!expected || !token || !timingSafeEqual(token, expected)) {
      throw problemException(AUTH_ERROR_CODES.sessionInvalid, correlationId, {
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    return true;
  }
}

function headerString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.[0] ?? null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
