import { Command } from "@nestjs/cqrs";

import type { GitHubAppCallbackDto } from "../../contracts/github-integration/github-app-callback.contract.js";

export class GitHubAppCallbackCommand extends Command<GitHubAppCallbackDto> {
  constructor(
    public readonly installationId: string,
    public readonly code: string,
    public readonly state: string,
    public readonly correlationId: string,
  ) {
    super();
  }
}
