import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
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
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });

    return {
      versionId: version?.id ?? "LCSP-LEGAL-CORPUS-v0.1.0",
      version: version?.version ?? "v0.1.0",
      status: "APPROVED",
      effectiveDate: new Date().toISOString(),
    };
  }
}
