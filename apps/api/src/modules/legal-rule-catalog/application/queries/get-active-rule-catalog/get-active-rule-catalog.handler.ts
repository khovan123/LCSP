import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetActiveRuleCatalogQuery } from "./get-active-rule-catalog.query.js";

@QueryHandler(GetActiveRuleCatalogQuery)
export class GetActiveRuleCatalogHandler implements IQueryHandler<GetActiveRuleCatalogQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<any> {
    const version = await this.prisma.legalRuleCatalogVersion.findFirst({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });

    if (!version) {
      throw new Error("No approved legal rule catalog version found");
    }

    const rules = await this.prisma.legalRule.findMany({
      where: { legalRuleCatalogVersionId: version.id, status: "APPROVED" },
      orderBy: { legalRuleId: "asc" },
    });

    return {
      versionId: version.id,
      version: version.version,
      status: version.status,
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
