import { randomUUID } from "node:crypto";

import type { StateGate } from "@lcsp/contracts/pbac";

type PolicyInput = {
  version: string;
  actions: string[];
  subjectRole: string;
  stateGate: StateGate;
  organizationId: string;
};

export class Policy {
  readonly id: string;
  readonly version: string;
  readonly actions: string[];
  readonly subjectRole: string;
  readonly stateGate: StateGate;
  organizationId: string;

  constructor(input: PolicyInput) {
    this.id = randomUUID();
    this.version = input.version;
    this.actions = [...input.actions];
    this.subjectRole = input.subjectRole;
    this.stateGate = input.stateGate;
    this.organizationId = input.organizationId;
  }

  static rehydrate(input: PolicyInput & { id: string }): Policy {
    const entity = new Policy(input);
    Object.assign(entity, { id: input.id });
    return entity;
  }

  allows(action: string): boolean {
    return this.actions.includes(action);
  }
}
