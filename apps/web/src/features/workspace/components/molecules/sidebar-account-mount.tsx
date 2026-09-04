"use client";

import {
  ChevronsUpDownIcon,
  LogOutIcon,
  PlugIcon,
  SettingsIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveAppMessage } from "@/lib/i18n";

type SidebarAccountMountProps = {
  navigateTo: (href: string) => void;
  onSignOut: () => void;
  signOutPending: boolean;
  userInitial: string;
  userName: string;
};

export function SidebarAccountMount({
  navigateTo,
  onSignOut,
  signOutPending,
  userInitial,
  userName,
}: SidebarAccountMountProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={resolveAppMessage("pages.appShell.accountMenu")}
            className="flex h-9 w-full items-center rounded-[7px] px-2.5 text-left outline-none transition-colors hover:bg-[#1b1b1b] focus-visible:ring-2 focus-visible:ring-[#8f8c85]"
            type="button"
          />
        }
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2b2b2b] text-xs font-medium text-[#dbd9d1]">
          {userInitial}
        </span>
        <span className="ml-2.5 min-w-0 flex-1 truncate text-[13.5px] font-normal text-[#d1cfc7]">
          {userName}
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-[#8f8c85]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-51"
        side="top"
        sideOffset={6}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigateTo("/workspace/settings")}>
            <SettingsIcon />
            {resolveAppMessage("pages.appShell.settings")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigateTo("/workspace/settings#repositories")}
          >
            <PlugIcon />
            {resolveAppMessage("pages.appShell.connectors")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={signOutPending}
            onClick={onSignOut}
            variant="destructive"
          >
            <LogOutIcon />
            {resolveAppMessage("pages.appShell.signOut")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
