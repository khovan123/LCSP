"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/organisms/form-card";
import { appLocale } from "@/lib/locale";
import { useMfaEnrollMutation } from "@/lib/api/auth-queries";
import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "@/lib/api/outcome-kinds";
import { MfaQrPreview } from "../molecules/mfa-qr-preview";
import type { MfaEnrollErrorState } from "../../types/mfa-enroll.types";

export function MfaEnrollForm() {
  const router = useRouter();
  const enrollMutation = useMfaEnrollMutation();
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [error, setError] = useState<MfaEnrollErrorState>(null);

  async function handleEnroll() {
    setError(null);
    const outcome = await enrollMutation.mutateAsync().catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.mfaEnroll.errors.requestFailedTitle" as const,
      detailKey: "pages.mfaEnroll.errors.requestFailedDetail" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.loaded) {
      setTotpUri(outcome.totpUri);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.sessionInvalid) {
      router.replace(API_REDIRECT_LOCATIONS.signIn);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.mfaRequired) {
      router.replace(API_REDIRECT_LOCATIONS.mfaVerify);
      return;
    }

    setError(outcome);
  }

  return (
    <FormCard
      eyebrow={resolveMessage(appLocale, "pages.mfaEnroll.formEyebrow")}
      title={resolveMessage(appLocale, "pages.mfaEnroll.formTitle")}
      description={resolveMessage(appLocale, "pages.mfaEnroll.formDescription")}
      footer={
        <>
          <Button
            className="w-full"
            type="button"
            onClick={handleEnroll}
            disabled={enrollMutation.isPending}
            aria-busy={enrollMutation.isPending}
          >
            {resolveMessage(
              appLocale,
              enrollMutation.isPending
                ? "pages.mfaEnroll.submitting"
                : "pages.mfaEnroll.submit",
            )}
          </Button>
          <Button render={<Link href={API_REDIRECT_LOCATIONS.mfaVerify} />} variant="ghost">
            {resolveMessage(appLocale, "pages.mfaEnroll.goToVerify")}
          </Button>
        </>
      }
      leading={
        <p className="text-sm text-muted-foreground">
          {resolveMessage(appLocale, "pages.mfaEnroll.accessHelp")}
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{resolveMessage(appLocale, error.titleKey)}</AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, error.detailKey)}
            </AlertDescription>
          </Alert>
        ) : null}

        {totpUri ? (
          <Alert>
            <AlertTitle>
              {resolveMessage(appLocale, "pages.mfaEnroll.successTitle")}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>
                {resolveMessage(appLocale, "pages.mfaEnroll.successDetail")}
              </p>
              <MfaQrPreview totpUri={totpUri} />
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </FormCard>
  );
}
