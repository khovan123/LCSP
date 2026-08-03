import { resolveMessage } from "@lcsp/i18n";

import { BrandMark } from "@/components/atoms/brand-mark";
import { appLocale } from "@/lib/locale";
import type { AuthShellProps } from "../../types/auth-shell.types";

export function AuthShell({
  children,
  homeLabel,
}: AuthShellProps) {
  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <BrandMark homeLabel={homeLabel} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-sm flex-col gap-6">
            {children}
            <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
              {t("pages.appShell.secureWorkspace")}
            </p>
          </div>
        </div>
      </div>
      <div
        className="auth-visual relative hidden overflow-hidden bg-muted lg:block"
        aria-hidden="true"
      >
        <div className="absolute inset-12 rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm" />
        <div className="absolute right-20 bottom-20 left-20 rounded-2xl border border-white/25 bg-black/10 p-8">
          <div className="mb-6 h-2 w-24 rounded-full bg-white/60" />
          <div className="flex flex-col gap-3">
            <div className="h-3 w-full rounded-full bg-white/25" />
            <div className="h-3 w-4/5 rounded-full bg-white/25" />
            <div className="h-3 w-3/5 rounded-full bg-white/25" />
          </div>
        </div>
      </div>
    </main>
  );
}

function t(key: string) {
  return resolveMessage(
    appLocale,
    key as Parameters<typeof resolveMessage>[1],
  );
}
