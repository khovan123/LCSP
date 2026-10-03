"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentRuntimeControl } from "./assessment-runtime-control-client";
import { mergeRuntimeControlResponse } from "./assessment-runtime-control-state";
import type { AssessmentRuntimeControlResult } from "@lcsp/contracts/evidence";

export function useAssessmentRuntimeControl(assessmentId: string) {
  const client = useQueryClient();
  const queryKey = ["assessment-runtime-control", assessmentId];
  const control = useQuery({
    queryKey,
    queryFn: () => assessmentRuntimeControl(assessmentId, "control"),
    refetchInterval: 1000,
  });
  const stop = useMutation({
    mutationFn: () =>
      assessmentRuntimeControl(assessmentId, "stop", control.data?.targetRunId),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (value) =>
      client.setQueryData<AssessmentRuntimeControlResult | null>(
        queryKey,
        (current) => mergeRuntimeControlResponse(current, value),
      ),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const resume = useMutation({
    mutationFn: () =>
      assessmentRuntimeControl(
        assessmentId,
        "continue",
        control.data?.targetRunId,
      ),
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: (value) =>
      client.setQueryData<AssessmentRuntimeControlResult | null>(
        queryKey,
        (current) => mergeRuntimeControlResponse(current, value),
      ),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  return { control, stop, resume };
}
