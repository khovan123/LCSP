import { Building2Icon, CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { WorkspaceMenuRowProps } from "../../types/workspace-menu-row.types";
import { WORKSPACE_MENU_ROW_STATES } from "../../types/workspace-menu-row.types";

export function WorkspaceMenuRow({
  workspace,
  state,
  pending,
  onSelect,
}: WorkspaceMenuRowProps) {
  return (
    <Button
      type="button"
      onClick={onSelect}
      variant="ghost"
      disabled={pending || state === WORKSPACE_MENU_ROW_STATES.current}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition",
        state === WORKSPACE_MENU_ROW_STATES.current
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        state === WORKSPACE_MENU_ROW_STATES.pending ? "bg-accent/70" : null,
      )}
    >
      <Building2Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : state === WORKSPACE_MENU_ROW_STATES.current ? (
        <CheckIcon className="size-4 shrink-0 text-primary" />
      ) : null}
    </Button>
  );
}
