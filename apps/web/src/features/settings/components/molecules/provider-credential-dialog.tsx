"use client";

import { REQUIRED_ACTIONS } from "@lcsp/contracts/auth";
import { CREDENTIAL_PROVIDERS } from "@lcsp/contracts/github-integration";
import type { CredentialProvider } from "@lcsp/contracts/github-integration";
import { resolveMessage } from "@lcsp/i18n";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useConfigureProviderCredentialMutation } from "@/lib/api/github-repository-queries";
import { appLocale } from "@/lib/locale";

type ProviderCredentialDialogProps = {
  onOpenChange: (open: boolean) => void;
  onReauthenticate?: (retry: () => void) => void;
  open: boolean;
  provider: CredentialProvider;
};

export function ProviderCredentialDialog({
  onOpenChange,
  onReauthenticate,
  open,
  provider,
}: ProviderCredentialDialogProps) {
  const [credential, setCredential] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const mutation = useConfigureProviderCredentialMutation();
  const providerLabel =
    provider === CREDENTIAL_PROVIDERS.github
      ? resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.githubProvider",
        )
      : resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.gitlabProvider",
        );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedCredential = credential.trim();
    if (!submittedCredential || mutation.isPending) return;

    mutation.mutate(
      { provider, credential: submittedCredential },
      {
        onSuccess: () => {
          setCredential("");
          setReauthRequired(false);
          onOpenChange(false);
        },
        onError: (error) => {
          if (
            error instanceof Error &&
            "requiredAction" in error &&
            error.requiredAction === REQUIRED_ACTIONS.reauthenticate
          ) {
            setCredential("");
            setReauthRequired(true);
            onReauthenticate?.(() => {
              queueMicrotask(() => {
                mutation.mutate({ provider, credential: submittedCredential });
              });
            });
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        closeLabel={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.dialogClose",
        )}
      >
        <DialogTitle>
          {resolveMessage(
            appLocale,
            "pages.workspace.settingsHub.repositories.patDialogTitle",
          )}
        </DialogTitle>
        <DialogDescription>
          {resolveMessage(
            appLocale,
            "pages.workspace.settingsHub.repositories.patDialogDescription",
          )}
        </DialogDescription>
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider-credential">
                {resolveMessage(
                  appLocale,
                  provider === CREDENTIAL_PROVIDERS.github
                    ? "pages.workspace.settingsHub.repositories.credentialLabel"
                    : "pages.workspace.settingsHub.repositories.gitlabCredentialLabel",
                )}
              </FieldLabel>
              <Input
                id="provider-credential"
                type="password"
                autoComplete="new-password"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
              />
              <FieldDescription>
                {resolveMessage(
                  appLocale,
                  "pages.workspace.settingsHub.repositories.patDialogProvider",
                )}
                {": "}
                {providerLabel}
              </FieldDescription>
            </Field>
          </FieldGroup>
          {reauthRequired ? (
            <p role="status" className="text-sm text-muted-foreground">
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.reauth.description",
              )}
            </p>
          ) : null}
          <DialogFooter className="px-0 pb-0">
            <Button
              type="submit"
              disabled={mutation.isPending || credential.trim().length === 0}
            >
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.actions.updatePat",
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
