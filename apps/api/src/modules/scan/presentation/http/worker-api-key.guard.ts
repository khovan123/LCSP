import { randomUUID, timingSafeEqual } from "node:crypto";

import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import type { Request } from "express";

import { problemException } from "../../../../platform/problems/problem-factory.js";

@Injectable()
export class WorkerApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = headerString(request.headers["x-worker-api-key"]);
    const correlationId =
      headerString(request.headers["x-correlation-id"]) ?? randomUUID();
    const expected = this.configService.get<string>("worker.apiKey", "");

    if (!provided || !expected || !secureEqual(provided, expected)) {
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

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
