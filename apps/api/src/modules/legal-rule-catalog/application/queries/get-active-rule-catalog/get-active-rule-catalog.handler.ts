import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { LEGAL_RULE_LIFECYCLE_STATUSES } from "@lcsp/contracts/legal-rule-catalog";
import {
  fromPrismaLegalRuleLifecycleStatus,
  toPrismaLegalRuleLifecycleStatus,
} from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetActiveRuleCatalogQuery } from "./get-active-rule-catalog.query.js";

type ActiveRuleCatalogResponse = {
  versionId: string;
  version: string;
  status: string;
  rules: Array<{
    legalRuleId: string;
    requiredFacts: unknown;
    optionalFacts: unknown;
    blockingFacts: unknown;
    unknownFactPolicy: string;
    citationLocatorRefs: unknown;
    ruleFamily: string | null;
  }>;
};

@QueryHandler(GetActiveRuleCatalogQuery)
export class GetActiveRuleCatalogHandler implements IQueryHandler<GetActiveRuleCatalogQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ActiveRuleCatalogResponse> {
    const version = await this.prisma.legalRuleCatalogVersion.findFirst({
      where: {
        status: toPrismaLegalRuleLifecycleStatus(
          LEGAL_RULE_LIFECYCLE_STATUSES.approved,
        ),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!version) {
      throw new Error("No approved legal rule catalog version found");
    }

    const rules = await this.prisma.legalRule.findMany({
      where: {
        legalRuleCatalogVersionId: version.id,
        status: toPrismaLegalRuleLifecycleStatus(
          LEGAL_RULE_LIFECYCLE_STATUSES.approved,
        ),
      },
      orderBy: { legalRuleId: "asc" },
    });

    return {
      versionId: version.id,
      version: version.version,
      status: fromPrismaLegalRuleLifecycleStatus(version.status),
      rules: rules.map((rule) => ({
        legalRuleId: rule.legalRuleId,
        requiredFacts: rule.requiredFacts,
        optionalFacts: rule.optionalFacts,
        blockingFacts: rule.blockingFacts,
        unknownFactPolicy: rule.unknownFactPolicy,
        citationLocatorRefs: rule.citationLocatorRefs,
        ruleFamily: rule.ruleFamily,
      })),
    };
  }
}
