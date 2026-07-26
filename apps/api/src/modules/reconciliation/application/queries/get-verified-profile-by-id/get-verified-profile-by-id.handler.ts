import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetVerifiedProfileByIdQuery } from "./get-verified-profile-by-id.query.js";

@QueryHandler(GetVerifiedProfileByIdQuery)
export class GetVerifiedProfileByIdHandler implements IQueryHandler<GetVerifiedProfileByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVerifiedProfileByIdQuery): Promise<any> {
    const profile = await this.prisma.verifiedProfile.findUnique({
      where: { id: query.verifiedProfileId },
    });

    if (!profile) {
      throw new Error("Verified profile not found");
    }

    return {
      id: profile.id,
      aiUsageFlowId: profile.aiUsageFlowId,
      assessmentId: profile.assessmentId,
      organizationId: profile.organizationId,
      schemaVersion: profile.schemaVersion,
      providerVersion: profile.providerVersion,
      mergedProfile: profile.profileData,
      evidenceRefs: profile.profileData?.evidenceRefs ?? [],
      status: profile.status,
      gatesPassedAt: profile.gatesPassedAt,
    };
  }
}
