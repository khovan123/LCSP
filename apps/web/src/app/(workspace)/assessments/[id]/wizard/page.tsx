import { WizardFormPage } from "@/features/wizard/components/organisms/wizard-form-page";

export default async function AssessmentWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WizardFormPage assessmentId={id} />;
}

