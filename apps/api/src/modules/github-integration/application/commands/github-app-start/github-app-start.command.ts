import { Command } from "@nestjs/cqrs";

import type { GitHubAppStartDto } from "../../contracts/github-integration/github-app-start.contract.js";

export class GitHubAppStartCommand extends Command<GitHubAppStartDto> {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly redirectUri: string | undefined,
    public readonly assessmentId: string | undefined,
    public readonly correlationId: string,
  ) {
    super();
  }
}
