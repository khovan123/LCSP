"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  SIDEBAR_NAV_ITEM_VARIANTS,
  type SidebarNavItemVariant,
} from "../../types/recent-filter.types";

type SidebarNavItemProps = {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
  title?: string;
  variant: SidebarNavItemVariant;
};

export function SidebarNavItem({
  active = false,
  ariaLabel,
  className,
  disabled = false,
  href,
  icon,
  label,
  onNavigate,
  title,
  variant,
}: SidebarNavItemProps) {
  const content = (
    <>
      {icon}
      <span
        className={cn(
          "min-w-0 truncate text-left",
          variant === SIDEBAR_NAV_ITEM_VARIANTS.new
            ? "text-sm font-medium text-[#d6d4cc]"
            : "text-sm font-normal text-[#dbd9d1]",
        )}
      >
        {label}
      </span>
    </>
  );
  const itemClassName = cn(
    "flex h-8 w-full items-center gap-2 rounded-[7px] px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#8f8c85]",
    active ? "bg-[#1f1f1f] hover:bg-[#242424]" : "hover:bg-[#1b1b1b]",
    disabled ? "cursor-default" : "cursor-pointer",
    className,
  );

  if (href && !disabled) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={itemClassName}
        href={href}
        onClick={onNavigate}
        title={title}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={itemClassName}
      title={title}
      type="button"
    >
      {content}
    </button>
  );
}
