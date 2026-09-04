"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { resolveAppMessage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type RecentFilterTriggerProps = ComponentPropsWithoutRef<"button"> & {
  open: boolean;
};

export const RecentFilterTrigger = forwardRef<
  HTMLButtonElement,
  RecentFilterTriggerProps
>(function RecentFilterTrigger(
  { className, open, type = "button", ...props },
  ref,
) {
  return (
    <button
      {...props}
      aria-label={resolveAppMessage("pages.appShell.recentFilter.trigger")}
      aria-pressed={open}
      className={cn(
        "relative flex size-7 items-center justify-center rounded-md outline-none transition-colors hover:bg-[#1b1b1b] focus-visible:ring-2 focus-visible:ring-[#8f8c85]",
        className,
      )}
      data-recent-filter-trigger="true"
      ref={ref}
      type={type}
    >
      <SlidersHorizontalIcon
        aria-hidden="true"
        className="pointer-events-none size-4 text-[#dbd9d1]"
      />
    </button>
  );
});
