"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

export function useQrCode(totpUri: string | null) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(
    totpUri ? null : null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!totpUri) {
      return () => {
        cancelled = true;
      };
    }

    void toDataURL(totpUri, {
      errorCorrectionLevel: "medium",
      margin: 1,
      width: 240,
    }).then((dataUrl) => {
      if (!cancelled) {
        setQrCodeDataUrl(dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  return qrCodeDataUrl;
}
