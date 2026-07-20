import type { Metadata } from "next";

import { DeveloperTaskSelection } from "@/features/developer-task/components/organisms/developer-task-selection";

export const metadata: Metadata = {
  title: "Choose a developer task | LCSP",
  description: "Choose an assessment within your current organization scope.",
};

export default function DeveloperAssessmentsPage() {
  return <DeveloperTaskSelection />;
}
