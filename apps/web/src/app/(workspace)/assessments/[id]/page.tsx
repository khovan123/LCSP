import { AssessmentOverview } from "@/features/workspace/components/organisms/assessment-overview";

export default async function AssessmentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssessmentOverview assessmentId={id} />;
}
