import { randomUUID } from "node:crypto";

import type { PersistedWizardStatusCode } from "@lcsp/contracts/assessment";

type WizardProfileEntityInput = {
  assessmentId: string;
  organizationId?: string;
  ownerId?: string;
  version?: number;
  status?: PersistedWizardStatusCode;
  answers?: Record<string, any>;
  submittedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

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

  constructor(props: WizardProfileEntityInput) {
    Object.assign(this, props, { id: randomUUID() });
  }

  static rehydrate(
    props: WizardProfileEntityInput & { id: string },
  ): WizardProfileEntity {
    const entity = new WizardProfileEntity(props);
    Object.assign(entity, { id: props.id });
    return entity;
  }
}
