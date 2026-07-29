"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveMessage } from "@lcsp/i18n";
import { Building2Icon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaceUiStore } from "@/features/workspace/stores/workspace-ui-store";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type WorkspaceOption = {
  id: string;
  name: string;
};

type WorkspaceSelectionPayload = {
  workspaces: WorkspaceOption[];
  selected_workspace_id?: string;
};

export function WorkspaceSwitcher({
  placement,
}: {
  placement: "header" | "sidebar";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const selectedWorkspaceId = useWorkspaceUiStore(
    (state) => state.selectedWorkspaceId,
  );
  const selectedWorkspaceName = useWorkspaceUiStore(
    (state) => state.selectedWorkspaceName,
  );
  const setSelectedWorkspace = useWorkspaceUiStore(
    (state) => state.setSelectedWorkspace,
  );
  const selectionQuery = useQuery({
    queryKey: ["mock-workspace-selection"],
    queryFn: loadWorkspaceSelection,
    retry: false,
  });
  const selectedId =
    selectedWorkspaceId ?? selectionQuery.data?.selected_workspace_id;
  const selectedWorkspace = selectionQuery.data?.workspaces.find(
    (workspace) => workspace.id === selectedId,
  );
  const label =
    selectedWorkspaceName ??
    selectedWorkspace?.name ??
    t("pages.appShell.switchWorkspace");
  const switchWorkspace = useMutation({
    mutationFn: persistWorkspaceSelection,
    onSuccess: async (workspace) => {
      setSelectedWorkspace(workspace);
      await queryClient.invalidateQueries({ queryKey: ["workspace"] });
      await queryClient.invalidateQueries({
        queryKey: ["mock-workspace-selection"],
      });
      router.refresh();
    },
  });

  useEffect(() => {
    if (selectedWorkspace && selectedWorkspaceName !== selectedWorkspace.name) {
      setSelectedWorkspace(selectedWorkspace);
    }
  }, [selectedWorkspace, selectedWorkspaceName, setSelectedWorkspace]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        switcherRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (selectionQuery.isError) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      ref={switcherRef}
      className={cn("relative", placement === "header" ? "ml-auto" : "w-full")}
    >
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant={placement === "header" ? "outline" : "ghost"}
            size={placement === "header" ? "sm" : "default"}
            className={
              placement === "header"
                ? "max-w-56 justify-between"
                : "w-full justify-between px-2"
            }
            title={t("pages.appShell.switchWorkspace")}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "absolute top-full z-50 mt-2 w-72 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
          placement === "header" ? "right-0" : "left-0",
        )}
      >
        {selectionQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-3 text-sm text-muted-foreground">
            <Spinner data-icon="inline-start" />
            {t("pages.workspaceSelector.loading")}
          </div>
        ) : null}
        <div className="space-y-1">
          {selectedWorkspace ? (
            <WorkspaceMenuRow
              workspace={selectedWorkspace}
              state="current"
              pending={switchWorkspace.isPending}
              onSelect={() => undefined}
            />
          ) : null}
          {selectionQuery.data?.workspaces
            .filter((workspace) => workspace.id !== selectedId)
            .map((workspace) => (
              <WorkspaceMenuRow
                key={workspace.id}
                workspace={workspace}
                state={
                  switchWorkspace.variables === workspace.id
                    ? "pending"
                    : "default"
                }
                pending={
                  switchWorkspace.isPending &&
                  switchWorkspace.variables === workspace.id
                }
                onSelect={() => {
                  switchWorkspace.mutate(workspace.id);
                  setIsOpen(false);
                }}
              />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WorkspaceMenuRow({
  workspace,
  state,
  pending,
  onSelect,
}: {
  workspace: WorkspaceOption;
  state: "current" | "default" | "pending";
  pending: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={pending || state === "current"}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition",
        state === "current"
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        state === "pending" ? "bg-accent/70" : null,
      )}
    >
      <Building2Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {workspace.name}
      </span>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : state === "current" ? (
        <CheckIcon className="size-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}

async function loadWorkspaceSelection(): Promise<WorkspaceSelectionPayload> {
  const response = await fetch("/api/mock/workspace-selection", {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error("workspace-selection-load-failed");
  }
  return (await response.json()) as WorkspaceSelectionPayload;
}

async function persistWorkspaceSelection(
  workspaceId: string,
): Promise<WorkspaceOption> {
  const response = await fetch("/api/mock/workspace-selection", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
  const payload = (await response.json().catch(() => null)) as {
    selected_workspace?: WorkspaceOption;
  } | null;
  if (!response.ok || !payload?.selected_workspace) {
    throw new Error("workspace-selection-save-failed");
  }
  return payload.selected_workspace;
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
