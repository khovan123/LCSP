import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";

export class SaveArchitectureScopeCommand {
  constructor(
    public readonly organizationId: string,
    public readonly assessmentId: string,
    public readonly globalDeclaration: string,
    public readonly repositories: {
      connectionId: string;
      declaration: string;
    }[],
  ) {}
}

@CommandHandler(SaveArchitectureScopeCommand)
export class SaveArchitectureScopeCommandHandler implements ICommandHandler<SaveArchitectureScopeCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: SaveArchitectureScopeCommand): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Update the global declaration on the assessment
      await tx.assessment.update({
        where: {
          id: command.assessmentId,
          organizationId: command.organizationId,
        },
        data: {
          globalArchitectureDeclaration: command.globalDeclaration,
        },
      });

      // 2. Delete all existing repository scopes for this assessment
      await tx.assessmentRepositoryScope.deleteMany({
        where: {
          assessmentId: command.assessmentId,
        },
      });

      // 3. Create the new repository scopes
      if (command.repositories.length > 0) {
        await tx.assessmentRepositoryScope.createMany({
          data: command.repositories.map((repo) => ({
            assessmentId: command.assessmentId,
            repositoryConnectionId: repo.connectionId,
            repoArchitectureDeclaration: repo.declaration,
          })),
        });
      }
    });
  }
}
