import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { LEGAL_RULE_LIFECYCLE_STATUSES } from "@lcsp/contracts/legal-rule-catalog";
import { toPrismaLegalRuleLifecycleStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetActiveLegalCorpusQuery } from "./get-active-legal-corpus.query.js";

type ActiveLegalCorpusResponse = {
  versionId: string;
  version: string;
  status: string;
  effectiveDate: string;
};

@QueryHandler(GetActiveLegalCorpusQuery)
export class GetActiveLegalCorpusHandler implements IQueryHandler<GetActiveLegalCorpusQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ActiveLegalCorpusResponse> {
    const version = await this.prisma.legalRuleCatalogVersion.findFirst({
      where: {
        status: toPrismaLegalRuleLifecycleStatus(
          LEGAL_RULE_LIFECYCLE_STATUSES.approved,
        ),
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      versionId: version?.id ?? "LCSP-LEGAL-CORPUS-v0.1.0",
      version: version?.version ?? "v0.1.0",
      status: LEGAL_RULE_LIFECYCLE_STATUSES.approved,
      effectiveDate: new Date().toISOString(),
    };
  }
}
