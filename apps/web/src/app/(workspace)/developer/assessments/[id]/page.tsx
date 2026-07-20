import type { Metadata } from "next";

import { DeveloperTaskWorkspace } from "@/features/developer-task/components/organisms/developer-task-workspace";

export const metadata: Metadata = {
  title: "Developer task workspace | LCSP",
  description: "Review assigned redacted technical findings.",
};

export default async function DeveloperAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeveloperTaskWorkspace key={id} assessmentId={id} />;
}
