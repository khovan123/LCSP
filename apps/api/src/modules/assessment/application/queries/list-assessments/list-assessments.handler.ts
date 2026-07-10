import { Inject, UnprocessableEntityException } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import {
  ASSESSMENT_REPOSITORY,
  type AssessmentListCriteria,
  type AssessmentRepository,
} from "../../ports/persistence/assessment.repository.js";
import type {
  AssessmentListDto,
  AssessmentSummary,
} from "../../contracts/assessment/assessment-list.contract.js";
import type { WizardStatus } from "../../contracts/assessment/assessment-detail.contract.js";
import { ASSESSMENT_STATUSES } from "../../../domain/entities/assessment.entity.js";
import { ListAssessmentsQuery } from "./list-assessments.query.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@QueryHandler(ListAssessmentsQuery)
export class ListAssessmentsHandler implements IQueryHandler<ListAssessmentsQuery> {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: ListAssessmentsQuery): Promise<AssessmentListDto> {
    const page = Math.max(DEFAULT_PAGE, query.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    if (query.status && !isKnownStatus(query.status)) {
      throw new UnprocessableEntityException({
        error_code: "INVALID_REQUEST",
        correlation_id: query.correlationId,
      });
    }

    const emptyResult = (): AssessmentListDto => ({
      assessments: [],
      total: 0,
      page,
      page_size: pageSize,
      correlation_id: query.correlationId,
    });

    // Developer (or any non-Manager role) with no scope on their membership has
    // nothing to see — fail closed rather than falling through to an org-wide query.
    if (query.subjectRole !== "Manager" && !query.scope) {
      return emptyResult();
    }

    const criteria: AssessmentListCriteria = {
      organizationId: query.organizationId,
      status: query.status,
      page,
      pageSize,
      ...(query.subjectRole === "Manager"
        ? { ownerId: query.sessionUserId }
        : { assessmentId: query.scope as string }),
    };

    const { items, total } = await this.assessmentRepository.findMany(criteria);

    if (items.length === 0) {
      return emptyResult();
    }

    const wizardStatuses = await this.loadWizardStatuses(
      items.map((item) => item.id),
    );

    const assessments: AssessmentSummary[] = items.map((item) => ({
      assessment_id: item.id,
      name: item.name,
      status: item.status,
      wizard_status: wizardStatuses.get(item.id) ?? "NOT_STARTED",
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
    }));

    return {
      assessments,
      total,
      page,
      page_size: pageSize,
      correlation_id: query.correlationId,
    };
  }

  private async loadWizardStatuses(
    assessmentIds: string[],
  ): Promise<Map<string, WizardStatus>> {
    const rows = await this.prisma.wizardProfile.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true, status: true },
    });

    return new Map(
      rows.map((row) => [row.assessmentId, row.status as WizardStatus]),
    );
  }
}

function isKnownStatus(status: string): boolean {
  return (ASSESSMENT_STATUSES as readonly string[]).includes(status);
}
