import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { HttpStatus, Injectable, type PipeTransform } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { z } from "zod";

import { problemException } from "../../platform/problems/problem-factory.js";

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: z.ZodTypeAny) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        randomUUID(),
        {
          status: HttpStatus.BAD_REQUEST,
        },
      );
    }
    return result.data as TOutput;
  }
}
