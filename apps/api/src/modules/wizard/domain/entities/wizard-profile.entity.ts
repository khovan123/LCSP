import type { PersistedWizardStatusCode } from "@lcsp/contracts/assessment";

export class WizardProfileEntity {
  id: string;
  assessmentId: string;
  organizationId: string;
  ownerId: string;
  version: number;
  status: PersistedWizardStatusCode;
  answers: Record<string, any>;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<WizardProfileEntity>) {
    Object.assign(this, props);
  }
}
