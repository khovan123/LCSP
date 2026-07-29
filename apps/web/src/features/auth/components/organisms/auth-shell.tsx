import { resolveMessage } from "@lcsp/i18n";
import { ShieldCheckIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/atoms/brand-mark";
import { appLocale } from "@/lib/locale";

export function AuthShell({
  children,
  homeLabel,
}: {
  children: ReactNode;
  homeLabel: string;
}) {
  return (
    <main className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(22rem,0.9fr)_minmax(32rem,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(255,255,255,.5), transparent 28%), linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "auto, 40px 40px, 40px 40px",
          }}
        />
        <div className="relative [&_[aria-hidden]]:border-primary-foreground">
          <BrandMark homeLabel={homeLabel} />
        </div>
        <div className="relative max-w-xl space-y-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/70 uppercase">
            {t("pages.appShell.authEyebrow")}
          </p>
          <h1 className="font-heading text-4xl leading-tight font-semibold xl:text-5xl">
            {t("pages.appShell.authTitle")}
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-primary-foreground/75">
            {t("pages.appShell.authDescription")}
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/70">
          <ShieldCheckIcon className="size-4" />
          {t("pages.appShell.secureWorkspace")}
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary lg:hidden" />
        <div className="flex w-full max-w-lg flex-col gap-8">
          <div className="lg:hidden">
            <BrandMark homeLabel={homeLabel} />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function t(key: string) {
  return resolveMessage(
    appLocale,
    key as Parameters<typeof resolveMessage>[1],
  );
}
