"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { resolveMessage } from "@lcsp/i18n";
import { toDataURL } from "qrcode";

import { appLocale } from "@/lib/locale";
import type { MfaQrPreviewProps } from "../../types/mfa-enroll.types";

export function MfaQrPreview({ totpUri }: MfaQrPreviewProps) {
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
    <div className="flex flex-col gap-2">
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
