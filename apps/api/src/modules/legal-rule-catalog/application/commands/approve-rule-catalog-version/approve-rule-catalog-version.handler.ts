import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import {
  LEGAL_RULE_EVENT_TYPES,
  LEGAL_RULE_ERROR_CODES,
} from "@lcsp/contracts/legal-rule-catalog";

import { ApproveRuleCatalogVersionCommand } from "./approve-rule-catalog-version.command.js";
import type { ApproveRuleCatalogVersionResponse } from "../../contracts/approve-catalog-version.contract.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";

@CommandHandler(ApproveRuleCatalogVersionCommand)
export class ApproveRuleCatalogVersionHandler implements ICommandHandler<
  ApproveRuleCatalogVersionCommand,
  ApproveRuleCatalogVersionResponse
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(
    command: ApproveRuleCatalogVersionCommand,
  ): Promise<ApproveRuleCatalogVersionResponse> {
    await this.assertApproveAction(command);

    const version = await this.prisma.legalRuleCatalogVersion.findUnique({
      where: { id: command.legalRuleCatalogVersionId },
    });

    if (!version) {
      throw new NotFoundException({
        error_code: "CATALOG_VERSION_NOT_FOUND",
        correlation_id: command.correlationId,
      });
    }

    if (version.status !== "DRAFT") {
      throw new ConflictException({
        error_code: LEGAL_RULE_ERROR_CODES.catalogVersionAlreadyApproved,
        correlation_id: command.correlationId,
      });
    }

    const approvedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Update version to APPROVED
      await tx.legalRuleCatalogVersion.update({
        where: { id: command.legalRuleCatalogVersionId },
        data: {
          status: "APPROVED",
          approvedAt,
        },
      });

      // 2. Create RuleApprovalRecord
      await tx.ruleApprovalRecord.create({
        data: {
          legalRuleCatalogVersionId: command.legalRuleCatalogVersionId,
          approvedBy: command.approvedBy,
          status: "APPROVED",
          scopeDescription: command.scopeDescription,
          comments: command.comments,
          approvalDate: approvedAt,
        },
      });

      // 3. Update all rules inside this version to APPROVED
      await tx.legalRule.updateMany({
        where: { legalRuleCatalogVersionId: command.legalRuleCatalogVersionId },
        data: { status: "APPROVED" },
      });

      // 4. Audit event
      await this.auditWriter.writeInTx(
        {
          eventType: LEGAL_RULE_EVENT_TYPES.catalogVersionApproved,
          actorId: command.approvedBy,
          organizationId: null,
          resourceType: "legal_rule_catalog_version",
          resourceId: command.legalRuleCatalogVersionId,
          decision: AUDIT_DECISIONS.allow,
          policyId: command.authorization.policyId,
          policyVersion: command.authorization.policyVersion,
          correlationId: command.correlationId,
          payload: {
            legalRuleCatalogVersionId: command.legalRuleCatalogVersionId,
            correlationId: command.correlationId,
          },
        },
        tx,
      );
    });

    return {
      id: command.legalRuleCatalogVersionId,
      version: version.version,
      status: "APPROVED",
      approvedAt: approvedAt.toISOString(),
    };
  }

  private async assertApproveAction(
    command: ApproveRuleCatalogVersionCommand,
  ): Promise<void> {
    const allowed =
      command.authorization.selectedAction ===
        PBAC_ACTIONS.legalRuleCatalogApprove &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    await this.auditWriter.write({
      eventType: LEGAL_RULE_EVENT_TYPES.catalogVersionApproved,
      actorId: command.approvedBy,
      organizationId: null,
      resourceType: "legal_rule_catalog_version",
      resourceId: command.legalRuleCatalogVersionId,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      correlationId: command.correlationId,
      policyId: command.authorization.policyId,
      policyVersion: command.authorization.policyVersion,
      payload: {
        action: PBAC_ACTIONS.legalRuleCatalogApprove,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw new ForbiddenException({
      error_code: AUTH_ERROR_CODES.pbacDenied,
      correlation_id: command.correlationId,
    });
  }
}
