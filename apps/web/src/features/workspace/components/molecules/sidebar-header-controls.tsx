"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PanelLeftIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveAppMessage } from "@/lib/i18n";

type SidebarHeaderControlsProps = {
  onBack: () => void;
  onForward: () => void;
  onSearch: () => void;
  onToggleCollapse: () => void;
};

export function SidebarHeaderControls({
  onBack,
  onForward,
  onSearch,
  onToggleCollapse,
}: SidebarHeaderControlsProps) {
  return (
    <div className="flex h-13 shrink-0 items-center gap-2 border-b border-[#292929] px-3">
      <SidebarHeaderButton
        Icon={PanelLeftIcon}
        label={resolveAppMessage("pages.appShell.sidebarToggle")}
        onClick={onToggleCollapse}
      />
      <SidebarHeaderButton
        Icon={SearchIcon}
        label={resolveAppMessage("pages.appShell.searchAssessments")}
        onClick={onSearch}
      />
      <SidebarHeaderButton
        Icon={ArrowLeftIcon}
        label={resolveAppMessage("pages.appShell.back")}
        onClick={onBack}
      />
      <SidebarHeaderButton
        Icon={ArrowRightIcon}
        label={resolveAppMessage("pages.appShell.forward")}
        onClick={onForward}
      />
    </div>
  );
}

function SidebarHeaderButton({
  Icon,
  label,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className="size-8 rounded-lg text-[#dbd9d1] hover:bg-[#1b1b1b] hover:text-[#dbd9d1] focus-visible:ring-2 focus-visible:ring-[#8f8c85]"
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icon aria-hidden="true" data-icon="inline-start" />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
