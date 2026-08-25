export class GitHubRepositoryDiscoveryRequest {
  credential!: string;
  limit?: number;
  cursor?: string;
}

export class GitHubCliRepositoryConnectionRequest {
  credential!: string;
  repository_full_name!: string;
  assessment_id?: string;
  credential_expires_at?: string;
}
