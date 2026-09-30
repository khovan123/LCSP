"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ASSESSMENT_REPOSITORY_PROVIDERS,
  type AssessmentRepositoryProvider,
} from "@lcsp/contracts/assessment";
import {
  CREDENTIAL_PROVIDERS,
  type CredentialProvider,
} from "@lcsp/contracts/github-integration";
import { resolveMessage } from "@lcsp/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  PROVIDER_CREDENTIAL_DIALOG_MODES,
  ProviderCredentialDialog,
  type ProviderCredentialDialogMode,
} from "@/features/settings/components/molecules/provider-credential-dialog";
import { AgentTurn } from "@/features/workspace/components/molecules/agent-turn";
import { TurnFooter } from "@/features/workspace/components/molecules/turn-footer";
import { AssessmentComposer } from "@/features/workspace/components/organisms/assessment-composer";
import { AssessmentTranscript } from "@/features/workspace/components/organisms/assessment-transcript";
import { useProviderCredentialStatusesQuery } from "@/lib/api/github-repository-queries";
import {
  connectAssessmentRepository,
  startRepositoryAnalysis,
} from "@/lib/api/repository-analysis-client";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";
import {
  useCreateAssessmentMutation,
  useDeleteAssessmentMutation,
} from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";

import {
  repositorySetupSchema,
  type RepositorySetupFormData,
} from "../../schemas/repository-setup.schema";
import type { GitProviderValue } from "../../types/assessment-flow.types";
import { RepositorySetupConversation } from "./repository-setup-conversation";

type RepositorySetupStepProps = {
  assessmentId?: string;
};

export function RepositorySetupStep({
  assessmentId,
}: RepositorySetupStepProps) {
  const router = useRouter();
  const createAssessment = useCreateAssessmentMutation();
  const deleteAssessment = useDeleteAssessmentMutation();
  const credentialStatuses = useProviderCredentialStatusesQuery();
  const [workingAssessmentId, setWorkingAssessmentId] = useState<
    string | undefined
  >(assessmentId);
  const [submitErrorKey, setSubmitErrorKey] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [credentialDialogMode, setCredentialDialogMode] =
    useState<ProviderCredentialDialogMode>(
      PROVIDER_CREDENTIAL_DIALOG_MODES.connect,
    );

  const form = useForm<RepositorySetupFormData>({
    resolver: zodResolver(repositorySetupSchema),
    defaultValues: {
      provider: undefined,
      repositoryUrl: "",
    },
  });

  const provider = useWatch({
    control: form.control,
    name: "provider",
  }) as GitProviderValue | undefined;
  const repositoryUrl =
    useWatch({
      control: form.control,
      name: "repositoryUrl",
    }) ?? "";

  const credentialProvider = toCredentialProvider(provider);
  const activeCredentialStatus = credentialStatuses.data?.find(
    (status) => status.provider === credentialProvider,
  );
  const credentialConfigured = activeCredentialStatus?.configured === true;
  const canEnterRepository = Boolean(
    provider && credentialProvider && credentialConfigured,
  );

  const validationErrorKey = form.formState.errors.repositoryUrl
    ? "pages.assessmentFlow.errors.repositoryUrl"
    : form.formState.errors.provider
      ? "pages.assessmentFlow.errors.repositoryUrl"
      : undefined;
  const activeErrorKey = validationErrorKey ?? submitErrorKey;

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitErrorKey(undefined);
    let newlyCreatedAssessmentId: string | undefined;

    try {
      let currentAssessmentId = workingAssessmentId;
      if (!currentAssessmentId) {
        const outcome = await createAssessment.mutateAsync({
          name: assessmentNameFromUrl(data.repositoryUrl),
        });
        if (outcome.kind !== API_OUTCOME_KINDS.created) {
          setSubmitErrorKey("pages.assessmentFlow.errors.createAssessment");
          return;
        }
        currentAssessmentId = outcome.assessmentId;
        newlyCreatedAssessmentId = outcome.assessmentId;
        setWorkingAssessmentId(currentAssessmentId);
      }

      const connection = await connectAssessmentRepository(
        currentAssessmentId,
        data.repositoryUrl,
      );
      await startRepositoryAnalysis(currentAssessmentId, {
        connectionId: connection.connectionId,
        branch: connection.defaultBranch,
      });
      router.replace(`/assessments/${currentAssessmentId}`);
    } catch (error) {
      // Rollback newly created uninitialized assessment to avoid orphan records in DB
      if (newlyCreatedAssessmentId) {
        try {
          await deleteAssessment.mutateAsync(newlyCreatedAssessmentId);
          setWorkingAssessmentId(undefined);
        } catch {
          // Ignore delete failure during cleanup attempt
        }
      }

      const resolvedKey = resolveRepositorySetupErrorKey(error);
      setSubmitErrorKey(resolvedKey);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <main
      className="flex h-full min-h-0 flex-col"
      data-surface="repository-setup"
    >
      <AssessmentTranscript autoScrollKey={[provider, activeErrorKey].join(":")}>
        <RepositorySetupConversation
          provider={provider}
          repositoryUrl={isSubmitting ? repositoryUrl.trim() : undefined}
          onProviderChange={(value) => {
            form.setValue("provider", value, { shouldValidate: true });
            form.setValue("repositoryUrl", "");
            form.clearErrors();
            setSubmitErrorKey(undefined);
          }}
          disabled={isSubmitting}
          footer={
            provider && credentialProvider && !credentialConfigured ? (
              <TurnFooter
                actions={[
                  {
                    id: "configure-provider",
                    label: t("pages.assessmentFlow.configureProvider"),
                    onSelect: () => {
                      setCredentialDialogMode(
                        PROVIDER_CREDENTIAL_DIALOG_MODES.connect,
                      );
                      setCredentialDialogOpen(true);
                    },
                  },
                ]}
              />
            ) : undefined
          }
        />
        {activeErrorKey ? (
          <AgentTurn>
            <Alert variant="destructive">
              <AlertTitle>{t("pages.assessmentFlow.errors.title")}</AlertTitle>
              <AlertDescription>{t(activeErrorKey)}</AlertDescription>
            </Alert>
          </AgentTurn>
        ) : null}
      </AssessmentTranscript>
      <AssessmentComposer
        value={repositoryUrl}
        onValueChange={(val) => {
          form.setValue("repositoryUrl", val);
          if (submitErrorKey) setSubmitErrorKey(undefined);
        }}
        onSubmit={handleSubmit}
        disabled={!canEnterRepository}
        submitting={isSubmitting}
        placeholder={t(
          canEnterRepository
            ? "pages.assessmentFlow.repositoryPlaceholder"
            : "pages.assessmentFlow.repositoryDisabledPlaceholder",
        )}
      />
      {credentialProvider ? (
        <ProviderCredentialDialog
          mode={credentialDialogMode}
          onModeChange={setCredentialDialogMode}
          onOpenChange={setCredentialDialogOpen}
          open={credentialDialogOpen}
          provider={credentialProvider}
          status={activeCredentialStatus ?? null}
        />
      ) : null}
    </main>
  );
}

function resolveRepositorySetupErrorKey(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("credential-invalid") ||
      msg.includes("credential-expired") ||
      msg.includes("unauthorized")
    ) {
      return "pages.workspace.settingsHub.repositories.credentialInvalidDescription";
    }
    if (
      msg.includes("repository-access-denied") ||
      msg.includes("repository-unavailable") ||
      msg.includes("repository-not-found")
    ) {
      return "pages.workspace.settingsHub.repositories.repositoryDeniedDescription";
    }
  }
  return "pages.assessmentFlow.errors.repositorySetup";
}

function toCredentialProvider(
  provider?: AssessmentRepositoryProvider,
): CredentialProvider | undefined {
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.github) {
    return CREDENTIAL_PROVIDERS.github;
  }
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.gitlab) {
    return CREDENTIAL_PROVIDERS.gitlab;
  }
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.bitbucket) {
    return CREDENTIAL_PROVIDERS.bitbucket;
  }
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.azureDevOps) {
    return CREDENTIAL_PROVIDERS.azureDevOps;
  }
  return undefined;
}

function assessmentNameFromUrl(repositoryUrl: string) {
  const pathname = new URL(repositoryUrl).pathname.replace(/\.git$/u, "");
  return pathname.split("/").filter(Boolean).slice(-2).join("/");
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
