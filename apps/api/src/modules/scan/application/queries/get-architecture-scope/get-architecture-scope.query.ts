import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";

export class GetArchitectureScopeQuery {
  constructor(
    public readonly organizationId: string,
    public readonly assessmentId: string,
  ) {}
}

@QueryHandler(GetArchitectureScopeQuery)
export class GetArchitectureScopeQueryHandler implements IQueryHandler<GetArchitectureScopeQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetArchitectureScopeQuery) {
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: query.assessmentId,
        organizationId: query.organizationId,
      },
      select: {
        globalArchitectureDeclaration: true,
        repositoryScopes: {
          select: {
            repositoryConnectionId: true,
            repoArchitectureDeclaration: true,
            repositoryConnection: {
              select: {
                repositoryName: true,
                repositoryFullName: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      return null;
    }

    // Fallback to legacy connection if no scopes exist
    let legacyRepos: any[] = [];
    if (assessment.repositoryScopes.length === 0) {
      const connections = await this.prisma.repositoryConnection.findMany({
        where: { assessmentId: query.assessmentId, status: "ACTIVE" },
        select: { id: true, repositoryName: true, repositoryFullName: true },
      });
      legacyRepos = connections.map((c) => ({
        connectionId: c.id,
        name: c.repositoryName,
        fullName: c.repositoryFullName,
        declaration: "",
      }));
    }

    const scopedRepos = assessment.repositoryScopes.map((scope) => ({
      connectionId: scope.repositoryConnectionId,
      name: scope.repositoryConnection.repositoryName,
      fullName: scope.repositoryConnection.repositoryFullName,
      declaration: scope.repoArchitectureDeclaration || "",
    }));

    return {
      globalDeclaration: assessment.globalArchitectureDeclaration || "",
      repositories:
        assessment.repositoryScopes.length > 0 ? scopedRepos : legacyRepos,
    };
  }
}
