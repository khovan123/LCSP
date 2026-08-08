import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";

@Controller("internal/classification/runtime")
@UseGuards(WorkerApiKeyGuard)
export class ClassificationRuntimeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("legal-rule-matches/:id")
  async getLegalRuleMatch(@Param("id") id: string) {
    const match = await this.prisma.legalRuleMatch.findUnique({
      where: { id },
      select: {
        id: true,
        verifiedProfileId: true,
        assessmentId: true,
        schemaVersion: true,
        matches: true,
        citationAllowlist: true,
        overallCoverageStatus: true,
        guardrailStatus: true,
        blockedReason: true,
        status: true,
      },
    });

    if (!match) {
      throw new NotFoundException("LegalRuleMatch not found");
    }

    const verifiedProfile = await this.prisma.verifiedProfile.findUnique({
      where: { id: match.verifiedProfileId },
      select: { profileData: true },
    });

    return {
      id: match.id,
      legal_rule_match_id: match.id,
      verified_profile_id: match.verifiedProfileId,
      assessment_id: match.assessmentId,
      schema_version: match.schemaVersion,
      matches: match.matches,
      citation_allowlist: match.citationAllowlist,
      overall_coverage_status: match.overallCoverageStatus,
      guardrail_status: String(match.guardrailStatus).toLowerCase(),
      blocked_reason: match.blockedReason,
      status: String(match.status).toLowerCase(),
      verified_profile_data: verifiedProfile?.profileData ?? {},
    };
  }
}
