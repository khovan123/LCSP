import { GitHubAppInstallState } from "../../../domain/entities/github-app-install-state.entity.js";

export const GITHUB_APP_INSTALL_STATE_REPOSITORY = Symbol(
  "GITHUB_APP_INSTALL_STATE_REPOSITORY",
);

export interface GitHubAppInstallStateRepository {
  save(installState: GitHubAppInstallState): Promise<void>;
}
