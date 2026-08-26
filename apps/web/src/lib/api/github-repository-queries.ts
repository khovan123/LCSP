"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  configureProviderCredential,
  getProviderCredentialStatuses,
  connectGitHubRepository,
  discoverGitHubRepositories,
} from "./github-repository-client";

export function useConfigureProviderCredentialMutation() {
  return useMutation({ mutationFn: configureProviderCredential });
}

export function useProviderCredentialStatusesQuery() {
  return useQuery({
    queryKey: ["provider-credentials"],
    queryFn: getProviderCredentialStatuses,
  });
}
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
