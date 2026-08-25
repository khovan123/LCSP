import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { HttpStatus } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { RBAC_ACTIONS } from "@lcsp/contracts/rbac";
import {
  LEGAL_RULE_EVENT_TYPES,
  LEGAL_RULE_ERROR_CODES,
  LEGAL_RULE_LIFECYCLE_STATUSES,
} from "@lcsp/contracts/legal-rule-catalog";

import { DraftLegalRuleCommand } from "./draft-legal-rule.command.js";
import type { DraftLegalRuleResponse } from "../../contracts/draft-legal-rule.contract.js";
import {
  fromPrismaLegalRuleLifecycleStatus,
  toPrismaLegalRuleLifecycleStatus,
} from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { CitationLocatorValidatorService } from "../../services/citation-locator-validator.service.js";

@CommandHandler(DraftLegalRuleCommand)
export class DraftLegalRuleHandler implements ICommandHandler<
  DraftLegalRuleCommand,
  DraftLegalRuleResponse
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly citationLocatorValidator: CitationLocatorValidatorService,
  ) {}

  async execute(
    command: DraftLegalRuleCommand,
  ): Promise<DraftLegalRuleResponse> {
    await this.assertAuthorAction(command);

    const version = await this.prisma.legalRuleCatalogVersion.findUnique({
      where: { id: command.legalRuleCatalogVersionId },
    });

    if (!version) {
      throw problemException(
        LEGAL_RULE_ERROR_CODES.catalogVersionNotFound,
        command.correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    if (
      fromPrismaLegalRuleLifecycleStatus(version.status) !==
      LEGAL_RULE_LIFECYCLE_STATUSES.draft
    ) {
      throw problemException(
        LEGAL_RULE_ERROR_CODES.catalogVersionAlreadyApproved,
        command.correlationId,
        { status: HttpStatus.CONFLICT },
      );
    }

    // Validate citations - throws UnprocessableEntityException on failure
    await this.citationLocatorValidator.validateAll(
      command.citationLocatorRefs,
    );

    const createdId = await this.prisma.$transaction(async (tx) => {
      const legalRule = await tx.legalRule.create({
        data: {
          legalRuleId: command.legalRuleId,
          legalRuleCatalogVersionId: command.legalRuleCatalogVersionId,
          ruleFamily: command.ruleFamily,
          requiredFacts:
            command.requiredFacts as unknown as Prisma.InputJsonValue,
          optionalFacts:
            command.optionalFacts as unknown as Prisma.InputJsonValue,
          blockingFacts:
            command.blockingFacts as unknown as Prisma.InputJsonValue,
          unknownFactPolicy: command.unknownFactPolicy,
          citationLocatorRefs:
            command.citationLocatorRefs as unknown as Prisma.InputJsonValue,
          status: toPrismaLegalRuleLifecycleStatus(
            LEGAL_RULE_LIFECYCLE_STATUSES.draft,
          ),
          authoredBy: command.authoredBy,
        },
      });

      // Audit log
      await this.auditWriter.writeInTx(
        {
          eventType: LEGAL_RULE_EVENT_TYPES.drafted,
          actorId: command.authoredBy,
          organizationId: null, // Legal catalog is system-wide, no org id.
          resourceType: AUDIT_RESOURCE_TYPES.legalRule,
          resourceId: legalRule.id,
          decision: AUDIT_DECISIONS.allow,
          policyId: command.authorization.policyId,
          policyVersion: command.authorization.policyVersion,
          correlationId: command.correlationId,
          payload: {
            legalRuleId: command.legalRuleId,
            legalRuleCatalogVersionId: command.legalRuleCatalogVersionId,
            correlationId: command.correlationId,
          },
        },
        tx,
      );

      return legalRule.id;
    });

    return {
      id: createdId,
      legalRuleId: command.legalRuleId,
      status: LEGAL_RULE_LIFECYCLE_STATUSES.draft,
    };
  }

  private async assertAuthorAction(
    command: DraftLegalRuleCommand,
  ): Promise<void> {
    const allowed =
      command.authorization.selectedAction ===
        RBAC_ACTIONS.legalRuleCatalogAuthor &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    await this.auditWriter.write({
      eventType: LEGAL_RULE_EVENT_TYPES.drafted,
      actorId: command.authoredBy,
      organizationId: null,
      resourceType: AUDIT_RESOURCE_TYPES.legalRule,
      resourceId: null,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.rbacDenied,
      correlationId: command.correlationId,
      policyId: command.authorization.policyId,
      policyVersion: command.authorization.policyVersion,
      payload: {
        legalRuleId: command.legalRuleId,
        action: RBAC_ACTIONS.legalRuleCatalogAuthor,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw problemException(AUTH_ERROR_CODES.rbacDenied, command.correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }
}
