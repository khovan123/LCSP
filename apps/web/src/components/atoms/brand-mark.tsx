import Link from "next/link";
import type { BrandMarkProps } from "../types/brand-mark.types";

export function BrandMark({ homeLabel }: BrandMarkProps) {
  return (
    <Link
      className="inline-flex w-max items-center gap-2.5 text-sm font-bold tracking-[0.15em] text-inherit no-underline"
      href="/"
      aria-label={homeLabel}
    >
      <span
        className="size-3.5 rotate-45 rounded-sm border-2 border-primary"
        aria-hidden="true"
      />
      LCSP
    </Link>
  );
}
