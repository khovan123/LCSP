import { ReadinessStatusPage } from "@/features/readiness/components/organisms/readiness-status-page";

export default async function AssessmentReadinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReadinessStatusPage assessmentId={id} />;
}

