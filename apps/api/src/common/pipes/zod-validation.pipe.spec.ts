import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { describe, expect, it } from "@jest/globals";
import { HttpException, HttpStatus } from "@nestjs/common";
import { z } from "zod";

import { ZodValidationPipe } from "./zod-validation.pipe.ts";

/**
 * Unit test suite for ZodValidationPipe.
 * Verifies that valid inputs pass through with correct types and invalid inputs throw standard RFC 7807 problem exceptions.
 */
describe("ZodValidationPipe", () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  const pipe = new ZodValidationPipe(schema);

  it("passes valid data through correctly", () => {
    const input = { email: "test@example.com", age: 25 };
    const output = pipe.transform(input);
    expect(output).toEqual(input);
  });

  it("throws standard validation problem HttpException on invalid data", () => {
    const invalidInput = { email: "not-an-email", age: 10 };
    try {
      pipe.transform(invalidInput);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpException = error as HttpException;
      expect(httpException.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = httpException.getResponse() as {
        ok: boolean;
        problem: { code: string; status: number };
      };
      expect(response.ok).toBe(false);
      expect(response.problem.code).toBe(AUTH_ERROR_CODES.validationFailed);
      expect(response.problem.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
