import { Controller, Get, HttpCode } from "@nestjs/common";
import { SERVICE_HEALTH_STATUSES } from "@lcsp/contracts/shared";
import { resultEnvelope } from "../../platform/problems/result-envelope.js";

@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(200)
  check() {
    return resultEnvelope({ status: SERVICE_HEALTH_STATUSES.ok });
  }
}
