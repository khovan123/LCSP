"use client";

import Link from "next/link";

import { getAssessmentActiveHref } from "@/lib/api/workspace-client";
import { cn } from "@/lib/utils";

import type { AssessmentSummary } from "../../types/workspace.types";

type RecentAssessmentItemProps = {
  active?: boolean;
  assessment: AssessmentSummary;
  onNavigate?: () => void;
  suppressHover?: boolean;
};

export function RecentAssessmentItem({
  active = false,
  assessment,
  onNavigate,
  suppressHover = false,
}: RecentAssessmentItemProps) {
  const href = getAssessmentActiveHref(assessment);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8.5 w-full items-center rounded-lg px-2.25 text-[13.5px] leading-none text-[#c7c4bd] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#8f8c85]",
        active ? "bg-[#252525]" : null,
        !suppressHover
          ? "hover:border hover:border-[#5c5c5c] hover:bg-[#292929]"
          : null,
      )}
      data-hover-suppressed={suppressHover ? "true" : "false"}
      href={href}
      onClick={onNavigate}
      title={assessment.name}
    >
      <span className="mr-2.25 size-1.75 shrink-0 rounded-full bg-[#1ba672]" />
      <span className="min-w-0 flex-1 truncate font-normal">
        {assessment.name}
      </span>
    </Link>
  );
}
