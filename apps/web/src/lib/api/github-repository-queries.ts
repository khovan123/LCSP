"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  connectGitHubRepository,
  discoverGitHubRepositories,
} from "./github-repository-client";
import { apiQueryKeys } from "./query-keys";

export function useDiscoverGitHubRepositoriesMutation() {
  return useMutation({ mutationFn: discoverGitHubRepositories });
}

export function useConnectGitHubRepositoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectGitHubRepository,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.auth.repositories(),
      });
    },
  });
}
