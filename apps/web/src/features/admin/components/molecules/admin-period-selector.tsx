"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import type { MessageKey } from "@lcsp/i18n";
import {
  ADMIN_OVERVIEW_PERIODS,
  type AdminOverviewPeriod,
} from "@lcsp/contracts/auth";

import { resolveAppMessage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: Array<{
  value: AdminOverviewPeriod;
  labelKey: MessageKey;
}> = [
  {
    value: ADMIN_OVERVIEW_PERIODS.p7d,
    labelKey: "pages.admin.overview.periods.p7d" as MessageKey,
  },
  {
    value: ADMIN_OVERVIEW_PERIODS.p30d,
    labelKey: "pages.admin.overview.periods.p30d" as MessageKey,
  },
  {
    value: ADMIN_OVERVIEW_PERIODS.p90d,
    labelKey: "pages.admin.overview.periods.p90d" as MessageKey,
  },
];

type AdminPeriodSelectorProps = {
  selectedPeriod: AdminOverviewPeriod;
  onSelectPeriod: (period: AdminOverviewPeriod) => void;
  disabled?: boolean;
};

export function AdminPeriodSelector({
  selectedPeriod,
  onSelectPeriod,
  disabled = false,
}: AdminPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    PERIOD_OPTIONS.find((opt) => opt.value === selectedPeriod) ??
    PERIOD_OPTIONS[1];

  const selectedLabel = resolveAppMessage(selectedOption.labelKey);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={resolveAppMessage(
          "pages.admin.overview.periodSelectorAria" as MessageKey,
        )}
        className={cn(
          "flex h-10 w-48 items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={resolveAppMessage(
            "pages.admin.overview.periodLabel" as MessageKey,
          )}
          className="absolute right-0 z-50 mt-1 flex w-48 flex-col gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg focus:outline-hidden"
        >
          {PERIOD_OPTIONS.map((option) => {
            const isSelected = option.value === selectedPeriod;
            const label = resolveAppMessage(option.labelKey);

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectPeriod(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex h-9 w-full items-center rounded-md px-2.5 text-xs font-medium transition-colors text-left",
                  isSelected
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
