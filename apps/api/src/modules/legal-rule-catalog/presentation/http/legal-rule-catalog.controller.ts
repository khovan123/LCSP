import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type {
  DraftLegalRuleRequest,
  DraftLegalRuleResponse,
} from "../../application/contracts/draft-legal-rule.contract.js";
import type {
  ApproveRuleCatalogVersionRequest,
  ApproveRuleCatalogVersionResponse,
} from "../../application/contracts/approve-catalog-version.contract.js";

import { DraftLegalRuleCommand } from "../../application/commands/draft-legal-rule/draft-legal-rule.command.js";
import { ApproveRuleCatalogVersionCommand } from "../../application/commands/approve-rule-catalog-version/approve-rule-catalog-version.command.js";

import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { randomUUID } from "node:crypto";
import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";

@Controller("internal/legal-rule-catalog")
export class LegalRuleCatalogController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("rules")
  @HttpCode(201)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.legalRuleCatalogAuthor)
  async draftRule(
    @Body() body: DraftLegalRuleRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<DraftLegalRuleResponse> {
    const { userId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return this.commandBus.execute(
      new DraftLegalRuleCommand(
        body.legalRuleId,
        body.ruleFamily,
        body.requiredFacts,
        body.optionalFacts,
        body.blockingFacts,
        body.unknownFactPolicy,
        body.citationLocatorRefs,
        userId,
        body.legalRuleCatalogVersionId,
        {
          subjectRole: pbacContext.subjectRole,
          selectedAction: pbacContext.selectedAction,
          policyId: pbacContext.policyId,
          policyVersion: pbacContext.policyVersion,
        },
        correlationId,
      ),
    );
  }

  @Post("versions/:versionId/approve")
  @HttpCode(200)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.legalRuleCatalogApprove)
  async approveVersion(
    @Param("versionId") versionId: string,
    @Body() body: ApproveRuleCatalogVersionRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApproveRuleCatalogVersionResponse> {
    const { userId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    // Passing some default values for scopeDescription since they are not in the contract body
    return this.commandBus.execute(
      new ApproveRuleCatalogVersionCommand(
        versionId,
        "Approved via API", // default scopeDescription
        null, // no comments provided in the basic API body yet
        userId,
        {
          subjectRole: pbacContext.subjectRole,
          selectedAction: pbacContext.selectedAction,
          policyId: pbacContext.policyId,
          policyVersion: pbacContext.policyVersion,
        },
        correlationId,
      ),
    );
  }
}
