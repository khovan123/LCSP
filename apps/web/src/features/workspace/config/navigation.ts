import type { MessageKey } from "@lcsp/i18n";
import {
  ClipboardListIcon,
  FileTextIcon,
  LayoutDashboardIcon,
} from "lucide-react";

import type { WorkspaceNavigationItem } from "../types/navigation.types";

export const workspaceNavigationItems = [
  {
    href: "/workspace",
    labelKey: "pages.workspace.overviewNav",
    icon: LayoutDashboardIcon,
  },
  {
    href: "/workspace#assessments",
    labelKey: "pages.workspace.assessmentsNav",
    icon: ClipboardListIcon,
  },
  {
    href: "/workspace#documents",
    labelKey: "pages.workspace.documentsNav",
    icon: FileTextIcon,
  },
] as const satisfies ReadonlyArray<{
  href: string;
  labelKey: MessageKey;
  icon: WorkspaceNavigationItem["icon"];
}>;
