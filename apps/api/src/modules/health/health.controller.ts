import { Controller, Get, HttpCode } from "@nestjs/common";
import { SERVICE_HEALTH_STATUSES } from "@lcsp/contracts/shared";

@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(200)
  check() {
    return { status: SERVICE_HEALTH_STATUSES.ok };
  }
}
