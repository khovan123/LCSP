"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@lcsp/contracts/shared/locale";

import { useMarketingLocale } from "./marketing-locale";

const LOCALE_COOKIE = "lcsp_locale";

export function LanguageSwitcher() {
  const locale = useMarketingLocale();
  const pathname = usePathname() ?? "/";
  const withoutLocale = pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";

  function hrefFor(nextLocale: Locale) {
    return `/${nextLocale}${withoutLocale === "/" ? "" : withoutLocale}`;
  }

  function select(nextLocale: Locale) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <nav
      aria-label={locale === "vi" ? "Ngôn ngữ" : "Language"}
      className="flex h-9 items-center rounded-lg border border-[#e3e3de] bg-[#f2f2ef] p-0.5 text-[11px] font-semibold"
    >
      {(["en", "vi"] as const).map((option) => (
        <Link
          key={option}
          href={hrefFor(option)}
          onClick={() => select(option)}
          aria-current={locale === option ? "true" : undefined}
          className={`rounded-md px-2 py-1.5 ${locale === option ? "bg-white text-[#0e7c66] shadow-sm" : "text-[#5f5f5a]"}`}
        >
          {option.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
