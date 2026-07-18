import { timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import {
  GITHUB_INTEGRATION_ERROR_CODES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
  type RepositoryScanTriggerSource,
} from "@lcsp/contracts/github-integration";

import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";

export interface ScanTriggerRequestContext extends Request {
  scanTriggerSource?: RepositoryScanTriggerSource;
}

@Injectable()
export class ScanTriggerGuard implements CanActivate {
  constructor(
    private readonly pbacGuard: PbacGuard,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ScanTriggerRequestContext>();
    const apiKey = headerString(request.headers["x-worker-api-key"]);
    const requestedSource = readTriggerSource(request.body);

    if (apiKey) {
      this.assertWorkerApiKey(apiKey);
      if (
        requestedSource &&
        requestedSource !== REPOSITORY_SCAN_TRIGGER_SOURCES.trusted
      ) {
        throw this.invalidSource();
      }
      request.scanTriggerSource = REPOSITORY_SCAN_TRIGGER_SOURCES.trusted;
      return true;
    }

    if (requestedSource === REPOSITORY_SCAN_TRIGGER_SOURCES.trusted) {
      throw new UnauthorizedException();
    }
    if (
      requestedSource &&
      requestedSource !== REPOSITORY_SCAN_TRIGGER_SOURCES.manual
    ) {
      throw this.invalidSource();
    }

    const allowed = await this.pbacGuard.canActivate(context);
    if (allowed) {
      request.scanTriggerSource = REPOSITORY_SCAN_TRIGGER_SOURCES.manual;
    }
    return allowed;
  }

  private assertWorkerApiKey(provided: string): void {
    const expected = this.configService.get<string>("worker.apiKey", "");
    if (!expected || !secureEqual(provided, expected)) {
      throw new UnauthorizedException();
    }
  }

  private invalidSource(): BadRequestException {
    return new BadRequestException({
      error_code: GITHUB_INTEGRATION_ERROR_CODES.scanTriggerSourceInvalid,
    });
  }
}

function readTriggerSource(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>).trigger_source;
  return typeof value === "string" ? value.trim() : null;
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
