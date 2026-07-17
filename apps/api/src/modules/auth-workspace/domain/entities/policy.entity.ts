import type { StateGate } from "@lcsp/contracts/pbac";

export class Policy {
  readonly id: string;
  readonly version: string;
  readonly actions: string[];
  readonly subjectRole: string;
  readonly stateGate: StateGate;
  organizationId: string;

  constructor(input: {
    id: string;
    version: string;
    actions: string[];
    subjectRole: string;
    stateGate: StateGate;
    organizationId: string;
  }) {
    this.id = input.id;
    this.version = input.version;
    this.actions = [...input.actions];
    this.subjectRole = input.subjectRole;
    this.stateGate = input.stateGate;
    this.organizationId = input.organizationId;
  }

  allows(action: string): boolean {
    return this.actions.includes(action);
  }
}
