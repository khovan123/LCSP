import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetVerifiedProfileByIdQuery } from "./get-verified-profile-by-id.query.js";

type VerifiedProfileResponse = {
  id: string;
  aiUsageFlowId: string | null;
  assessmentId: string | null;
  organizationId: string | null;
  schemaVersion: string | null;
  providerVersion: string | null;
  mergedProfile: unknown;
  evidenceRefs: unknown[];
  status: string | null;
  gatesPassedAt: Date | null;
};

function toEvidenceRefs(profileData: unknown): unknown[] {
  if (
    typeof profileData === "object" &&
    profileData !== null &&
    !Array.isArray(profileData)
  ) {
    const candidate = profileData as Record<string, unknown>;
    if (Array.isArray(candidate.evidenceRefs)) {
      return candidate.evidenceRefs;
    }
  }

  return [];
}

@QueryHandler(GetVerifiedProfileByIdQuery)
export class GetVerifiedProfileByIdHandler implements IQueryHandler<GetVerifiedProfileByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetVerifiedProfileByIdQuery,
  ): Promise<VerifiedProfileResponse> {
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
      evidenceRefs: toEvidenceRefs(profile.profileData),
      status: profile.status,
      gatesPassedAt: profile.gatesPassedAt,
    };
  }
}
