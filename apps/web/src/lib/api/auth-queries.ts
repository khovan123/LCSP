"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  acceptInvitation,
  previewInvitation,
  signIn,
  signOut,
  verifyMfaOtp,
} from "./auth-client";
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

export function useAcceptInvitationMutation() {
  return useMutation({ mutationFn: acceptInvitation });
}

export function useMfaVerifyMutation() {
  return useMutation({ mutationFn: verifyMfaOtp });
}

export function useSignOutMutation() {
  return useMutation({ mutationFn: signOut });
}
