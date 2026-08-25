import { z } from "zod";

export const githubRepositoryCredentialSchema = z.object({
  credential: z.string().trim().min(1).max(512),
});

export type GitHubRepositoryCredentialValues = z.infer<
  typeof githubRepositoryCredentialSchema
>;
