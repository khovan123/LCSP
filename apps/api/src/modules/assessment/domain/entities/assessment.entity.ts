import { randomUUID } from "node:crypto";

import {
  ASSESSMENT_STATUS_CODES,
  type AssessmentStatusCode,
} from "@lcsp/contracts/assessment";

export type AssessmentStatus = AssessmentStatusCode;

type AssessmentProps = {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: AssessmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

type NewAssessmentProps = Omit<AssessmentProps, "id">;

export class Assessment {
  private constructor(props: NewAssessmentProps) {
    this.props = { ...props, id: randomUUID() };
  }

  private props: AssessmentProps;

  static create(input: {
    organizationId: string;
    ownerId: string;
    name: string;
    description?: string | null;
  }): Assessment {
    const now = new Date();

    return new Assessment({
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: ASSESSMENT_STATUS_CODES.wizardInProgress,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: AssessmentProps): Assessment {
    const entity = new Assessment(props);
    entity.props = props;
    return entity;
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): AssessmentStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
