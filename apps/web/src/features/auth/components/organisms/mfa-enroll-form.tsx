"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";
import { toDataURL } from "qrcode";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormCard } from "@/components/organisms/form-card";
import { appLocale } from "@/lib/locale";
import { useMfaEnrollMutation } from "@/lib/api/auth-queries";
import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "@/lib/api/outcome-kinds";

export function MfaEnrollForm() {
  const router = useRouter();
  const enrollMutation = useMfaEnrollMutation();
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [error, setError] = useState<{
    titleKey: Parameters<typeof resolveMessage>[1];
    detailKey: Parameters<typeof resolveMessage>[1];
  } | null>(null);

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
          <Link
            className={buttonVariants({ variant: "ghost" })}
            href={API_REDIRECT_LOCATIONS.mfaVerify}
          >
            {resolveMessage(appLocale, "pages.mfaEnroll.goToVerify")}
          </Link>
        </>
      }
      leading={
        <p className="text-sm text-muted-foreground">
          {resolveMessage(appLocale, "pages.mfaEnroll.accessHelp")}
        </p>
      }
    >
      <div className="space-y-4">
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
            <AlertDescription className="space-y-3">
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

function MfaQrPreview({ totpUri }: { totpUri: string }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void toDataURL(totpUri, {
      errorCorrectionLevel: "medium",
      margin: 1,
      width: 240,
    }).then((dataUrl: string) => {
      if (!cancelled) {
        setQrCodeDataUrl(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  if (!qrCodeDataUrl) {
    return (
      <p className="text-sm text-muted-foreground">
        {resolveMessage(appLocale, "pages.mfaEnroll.qrLoading")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {resolveMessage(appLocale, "pages.mfaEnroll.qrTitle")}
      </p>
      <div className="inline-flex rounded-xl border bg-white p-3">
        <Image
          src={qrCodeDataUrl}
          alt={resolveMessage(appLocale, "pages.mfaEnroll.qrAlt")}
          className="size-60 max-w-full"
          width={240}
          height={240}
          unoptimized
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {resolveMessage(appLocale, "pages.mfaEnroll.qrHint")}
      </p>
    </div>
  );
}
