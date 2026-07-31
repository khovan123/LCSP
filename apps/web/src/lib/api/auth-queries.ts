"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptInvitation,
  confirmPasswordRecovery,
  disableMfa,
  enrollMfa,
  getAuthRepositories,
  getAuthSessions,
  getAuthSettingsProfile,
  previewInvitation,
  revokeAuthSession,
  requestPasswordRecovery,
  signIn,
  signOut,
  updateProfile,
  verifyMfaOtp,
} from "./auth-client";
import { API_OUTCOME_KINDS } from "./outcome-kinds";
import { apiQueryKeys } from "./query-keys";

export function useSignInMutation() {
  return useMutation({ mutationFn: signIn });
}

export function useInvitationPreviewQuery(invitationToken: string) {
  return useQuery({
    queryKey: apiQueryKeys.auth.invitationPreview(invitationToken),
    queryFn: () => previewInvitation(invitationToken),
    enabled: invitationToken.length > 0,
    retry: false,
  });
}

export function useAuthSettingsProfileQuery() {
  return useQuery({
    queryKey: apiQueryKeys.auth.settingsProfile(),
    queryFn: getAuthSettingsProfile,
  });
}

export function useAuthSessionsQuery() {
  return useQuery({
    queryKey: apiQueryKeys.auth.sessions(),
    queryFn: getAuthSessions,
  });
}

export function useAuthRepositoriesQuery() {
  return useQuery({
    queryKey: apiQueryKeys.auth.repositories(),
    queryFn: getAuthRepositories,
  });
}

export function useAcceptInvitationMutation() {
  return useMutation({ mutationFn: acceptInvitation });
}

export function useMfaVerifyMutation() {
  return useMutation({ mutationFn: verifyMfaOtp });
}

export function useMfaEnrollMutation() {
  return useMutation({ mutationFn: enrollMfa });
}

export function useDisableMfaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableMfa,
    onSuccess: async (outcome) => {
      if (outcome.kind !== API_OUTCOME_KINDS.disabled) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: apiQueryKeys.auth.settingsProfile(),
        }),
        queryClient.invalidateQueries({
          queryKey: apiQueryKeys.auth.sessions(),
        }),
      ]);
    },
  });
}

export function useRequestRecoveryMutation() {
  return useMutation({ mutationFn: requestPasswordRecovery });
}

export function useConfirmRecoveryMutation() {
  return useMutation({ mutationFn: confirmPasswordRecovery });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async (outcome) => {
      if (outcome.kind !== "saved") {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.auth.settingsProfile(),
      });
    },
  });
}

export function useSignOutMutation() {
  return useMutation({ mutationFn: signOut });
}

export function useRevokeAuthSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAuthSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.auth.sessions(),
      });
    },
  });
}
