"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDevelopers,
  inviteDeveloper,
  revokeMembership,
} from "./developer-client";

export function useDevelopersQuery() {
  return useQuery({
    queryKey: ["workspace", "developers"],
    queryFn: getDevelopers,
  });
}

export function useInviteDeveloperMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => inviteDeveloper(email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", "developers"],
      });
    },
  });
}

export function useRevokeMembershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => revokeMembership(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", "developers"],
      });
    },
  });
}
