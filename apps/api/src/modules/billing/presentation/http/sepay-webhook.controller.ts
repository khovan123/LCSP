import { Controller, Headers, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  SePayWebhookIngressError,
  SePayWebhookIngressService,
} from "../../application/services/sepay-webhook-ingress.service.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";

@Controller("billing/sepay")
export class SePayWebhookController {
  constructor(private readonly ingress: SePayWebhookIngressService) {}

  @Post("webhook")
  async receive(
    @Req() request: Request,
    @Headers("x-sepay-signature") signature?: string,
    @Headers("x-sepay-timestamp") timestamp?: string,
  ) {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.alloc(0);
    try {
      const result = await this.ingress.accept({
        rawBody,
        signature,
        timestamp,
      });
      return { success: true, duplicate: result.duplicate };
    } catch (error) {
      if (error instanceof SePayWebhookIngressError) {
        const code =
          error.reason === "SIGNATURE"
            ? "BILLING_WEBHOOK_SIGNATURE_INVALID"
            : error.reason === "TIMESTAMP"
              ? "BILLING_WEBHOOK_TIMESTAMP_STALE"
              : "BILLING_WEBHOOK_PAYLOAD_INVALID";
        throw problemException(code, "sepay-webhook", {
          status: HttpStatus.BAD_REQUEST,
        });
      }
      throw error;
    }
  }
}
