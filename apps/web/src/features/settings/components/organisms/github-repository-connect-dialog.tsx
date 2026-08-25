"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resolveMessage } from "@lcsp/i18n";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  useConnectGitHubRepositoryMutation,
  useDiscoverGitHubRepositoriesMutation,
} from "@/lib/api/github-repository-queries";
import type { GitHubRepositoryDiscovery } from "@/lib/api/github-repository-client";
import { githubRepositoryProblemMessageKey } from "@/lib/api/github-repository-client";
import { appLocale } from "@/lib/locale";

import {
  githubRepositoryCredentialSchema,
  type GitHubRepositoryCredentialValues,
} from "../../schemas/github-repository-connect.schema";

type GitHubRepositoryConnectDialogProps = {
  open: boolean;
  assessmentId?: string;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function GitHubRepositoryConnectDialog({
  open,
  assessmentId,
  onOpenChange,
  onConnected,
}: GitHubRepositoryConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <GitHubRepositoryConnectDialogContent
          assessmentId={assessmentId}
          onOpenChange={onOpenChange}
          onConnected={onConnected}
        />
      ) : null}
    </Dialog>
  );
}

function GitHubRepositoryConnectDialogContent({
  assessmentId,
  onOpenChange,
  onConnected,
}: Omit<GitHubRepositoryConnectDialogProps, "open">) {
  const [discovery, setDiscovery] = useState<GitHubRepositoryDiscovery | null>(
    null,
  );
  const [repositoryFullName, setRepositoryFullName] = useState("");
  const discoveryMutation = useDiscoverGitHubRepositoriesMutation();
  const connectMutation = useConnectGitHubRepositoryMutation();
  const form = useForm<GitHubRepositoryCredentialValues>({
    resolver: zodResolver(githubRepositoryCredentialSchema),
    defaultValues: { credential: "" },
  });
  const failed = discoveryMutation.isError || connectMutation.isError;
  const requestError = discoveryMutation.error ?? connectMutation.error;

  async function submit(values: GitHubRepositoryCredentialValues) {
    try {
      if (!discovery) {
        const result = await discoveryMutation.mutateAsync({
          credential: values.credential,
          limit: 50,
        });
        setDiscovery(result);
        setRepositoryFullName(result.repositories[0]?.full_name ?? "");
        form.reset({ credential: "" });
        return;
      }
      await connectMutation.mutateAsync({
        credential: values.credential,
        repository_full_name: repositoryFullName,
        ...(assessmentId ? { assessment_id: assessmentId } : {}),
      });
      form.reset({ credential: "" });
      onConnected();
      onOpenChange(false);
    } finally {
      if (discovery) form.reset({ credential: "" });
    }
  }

  return (
    <DialogContent
      closeLabel={resolveMessage(
        appLocale,
        "pages.workspace.settingsHub.repositories.dialogClose",
      )}
    >
      <DialogHeader>
        <DialogTitle>
          {resolveMessage(
            appLocale,
            "pages.workspace.settingsHub.repositories.dialogTitle",
          )}
        </DialogTitle>
        <DialogDescription>
          {resolveMessage(
            appLocale,
            discovery
              ? "pages.workspace.settingsHub.repositories.connectCredentialDescription"
              : "pages.workspace.settingsHub.repositories.discoveryDescription",
          )}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        {discovery ? (
          <Field>
            <FieldLabel htmlFor="github-repository-selection">
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.repositories.repositoryLabel",
              )}
            </FieldLabel>
            <Select
              value={repositoryFullName}
              onValueChange={(value) => setRepositoryFullName(value ?? "")}
            >
              <SelectTrigger
                id="github-repository-selection"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {discovery.repositories.map((repository) => (
                  <SelectItem
                    key={repository.repository_id}
                    value={repository.full_name}
                  >
                    {repository.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            <Field
              data-invalid={
                Boolean(form.formState.errors.credential) || undefined
              }
            >
              <FieldLabel htmlFor="github-manager-credential">
                {resolveMessage(
                  appLocale,
                  "pages.workspace.settingsHub.repositories.credentialLabel",
                )}
              </FieldLabel>
              <Input
                id="github-manager-credential"
                type="password"
                autoComplete="off"
                spellCheck={false}
                {...form.register("credential")}
              />
              {form.formState.errors.credential?.message ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.repositories.credentialRequired",
                  )}
                </FieldError>
              ) : null}
            </Field>
            {failed ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.repositories.requestFailedTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(
                    appLocale,
                    githubRepositoryProblemMessageKey(requestError),
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                (Boolean(discovery) && !repositoryFullName)
              }
            >
              {form.formState.isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {resolveMessage(
                appLocale,
                discovery
                  ? "pages.workspace.settingsHub.repositories.connectAction"
                  : "pages.workspace.settingsHub.repositories.discoverAction",
              )}
            </Button>
          </FieldGroup>
        </form>
      </DialogBody>
    </DialogContent>
  );
}
