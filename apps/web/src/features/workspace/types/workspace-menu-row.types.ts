import type { WorkspaceSelectionOption } from "@/lib/api/workspace-client";

export const WORKSPACE_MENU_ROW_STATES = {
  current: "current",
  default: "default",
  pending: "pending",
} as const;

export type WorkspaceMenuRowState =
  (typeof WORKSPACE_MENU_ROW_STATES)[keyof typeof WORKSPACE_MENU_ROW_STATES];

export type WorkspaceMenuRowProps = {
  workspace: WorkspaceSelectionOption;
  state: WorkspaceMenuRowState;
  pending: boolean;
  onSelect: () => void;
};
