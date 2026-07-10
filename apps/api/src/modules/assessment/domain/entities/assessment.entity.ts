export const ASSESSMENT_STATUSES = ["WIZARD_IN_PROGRESS"] as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

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

export class Assessment {
  private constructor(private readonly props: AssessmentProps) {}

  static create(input: {
    organizationId: string;
    ownerId: string;
    name: string;
    description?: string | null;
  }): Assessment {
    const now = new Date();

    return new Assessment({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: "WIZARD_IN_PROGRESS",
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: AssessmentProps): Assessment {
    return new Assessment(props);
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
