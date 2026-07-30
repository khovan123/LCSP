import { create } from "zustand";

type WorkspaceUiState = {
  selectedAssessmentId?: string;
  selectedWorkspaceId?: string;
  selectedWorkspaceName?: string;
  setSelectedAssessmentId: (id?: string) => void;
  setSelectedWorkspace: (workspace?: { id: string; name: string }) => void;
};

export const useWorkspaceUiStore = create<WorkspaceUiState>((set) => ({
  selectedAssessmentId: undefined,
  selectedWorkspaceId: undefined,
  selectedWorkspaceName: undefined,
  setSelectedAssessmentId: (selectedAssessmentId) =>
    set({ selectedAssessmentId }),
  setSelectedWorkspace: (workspace) =>
    set({
      selectedWorkspaceId: workspace?.id,
      selectedWorkspaceName: workspace?.name,
    }),
}));
