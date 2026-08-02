"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getClassificationStatus } from "./classification-client";
import {
  getPendingConflicts,
  resolveConflict,
  type ResolveConflictPayload,
} from "./conflict-client";
import {
  getDocumentStatus,
  getDocuments,
  requestFinalReport,
  requestGapAnalysis,
} from "./document-client";
import { getTechnicalEvidence } from "./evidence-client";
import { getReadinessStatus } from "./readiness-client";
import {
  getReadinessExportHistory,
  requestReadinessExport,
} from "./readiness-export-client";
import {
  getWizardAssessment,
  saveWizardDraft,
  submitWizard,
} from "./wizard-client";
import { apiQueryKeys } from "./query-keys";
import type { WizardAnswer } from "@lcsp/contracts/wizard";

export function useClassificationStatusQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.classification(assessmentId),
    queryFn: () => getClassificationStatus(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useReadinessStatusQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.readiness(assessmentId),
    queryFn: () => getReadinessStatus(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useGenerateReadinessExportMutation(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestReadinessExport(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assessment.readinessExports(assessmentId),
      });
    },
  });
}

export function useReadinessExportHistoryQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.readinessExports(assessmentId),
    queryFn: () => getReadinessExportHistory(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useWizardAssessmentQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.wizard(assessmentId),
    queryFn: () => getWizardAssessment(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useSaveWizardDraftMutation(assessmentId: string) {
  return useMutation({
    mutationFn: (answers: WizardAnswer[]) =>
      saveWizardDraft(assessmentId, answers),
  });
}

export function useSubmitWizardMutation(assessmentId: string) {
  return useMutation({
    mutationFn: (answers: WizardAnswer[]) =>
      submitWizard(assessmentId, answers),
  });
}

export function usePendingConflictsQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.conflicts(assessmentId),
    queryFn: () => getPendingConflicts(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useResolveConflictMutation(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conflictId,
      request,
    }: {
      conflictId: string;
      request: ResolveConflictPayload;
    }) => resolveConflict(assessmentId, conflictId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assessment.conflicts(assessmentId),
      });
    },
  });
}

export function useTechnicalEvidenceQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.evidence(assessmentId),
    queryFn: () => getTechnicalEvidence(assessmentId),
    enabled: assessmentId.length > 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

export function useDocumentsQuery(assessmentId: string) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.documents(assessmentId),
    queryFn: () => getDocuments(assessmentId),
    enabled: assessmentId.length > 0,
  });
}

export function useDocumentStatusQuery(
  assessmentId: string,
  documentRequestId: string,
) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.documentStatus(
      assessmentId,
      documentRequestId,
    ),
    queryFn: () => getDocumentStatus(assessmentId, documentRequestId),
    enabled: assessmentId.length > 0 && documentRequestId.length > 0,
  });
}

export function useRequestFinalReportMutation(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestFinalReport(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assessment.documents(assessmentId),
      });
    },
  });
}

export function useRequestGapAnalysisMutation(assessmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestGapAnalysis(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.assessment.documents(assessmentId),
      });
    },
  });
}
