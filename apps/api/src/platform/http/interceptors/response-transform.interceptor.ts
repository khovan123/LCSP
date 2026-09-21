import { Injectable, Optional } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { BYPASS_ENVELOPE_KEY } from "./bypass-envelope.decorator.js";

type HttpResponse = {
  headersSent?: boolean;
};

/**
 * Automatically wraps successful controller return values in the standardized API success envelope { ok: true, data }.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly reflector?: Reflector) {}

  /**
   * Inspects each handler response and wraps successful data into { ok: true, data }.
   *
   * @param context - Nest execution context used to access the HTTP response.
   * @param next - Downstream handler whose response stream should be wrapped.
   * @returns Observable containing the wrapped body.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<HttpResponse>();
    const isBypassed = this.reflector?.get<boolean>(
      BYPASS_ENVELOPE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: unknown) => {
        if (response?.headersSent || isBypassed) {
          return data;
        }

        return {
          ok: true,
          data,
        };
      }),
    );
  }
}
