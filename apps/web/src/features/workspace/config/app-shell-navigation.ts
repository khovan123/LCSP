import {
  ClipboardCheckIcon,
  FileCheck2Icon,
  FileTextIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "lucide-react";

type NavigationDefinition = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboardIcon;
  exact?: boolean;
};

export const primaryNavigation = [
  {
    href: "/workspace",
    labelKey: "pages.appShell.overview",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: "/workspace#assessments",
    labelKey: "pages.appShell.assessments",
    icon: ListChecksIcon,
  },
] as const satisfies readonly NavigationDefinition[];

export const developerNavigation = [
  {
    href: "/developer/assessments",
    labelKey: "pages.appShell.developer",
    icon: ClipboardCheckIcon,
  },
] as const satisfies readonly NavigationDefinition[];

export function getAssessmentNavigation(
  assessmentId: string,
): readonly NavigationDefinition[] {
  const basePath = `/assessments/${encodeURIComponent(assessmentId)}`;

  return [
    {
      href: `${basePath}/wizard`,
      labelKey: "pages.appShell.wizard",
      icon: FileCheck2Icon,
    },
    {
      href: `${basePath}/readiness`,
      labelKey: "pages.appShell.readiness",
      icon: GaugeIcon,
    },
    {
      href: `${basePath}/classification`,
      labelKey: "pages.appShell.classification",
      icon: ShieldCheckIcon,
    },
    {
      href: `${basePath}/documents`,
      labelKey: "pages.appShell.documents",
      icon: FileTextIcon,
    },
    {
      href: `${basePath}/conflicts`,
      labelKey: "pages.appShell.conflicts",
      icon: ScaleIcon,
    },
  ];
}
