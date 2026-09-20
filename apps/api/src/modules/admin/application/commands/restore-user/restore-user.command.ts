import type { AdminActor } from "../../services/admin-account.transaction.js";

export class RestoreUserCommand {
  constructor(
    public readonly targetId: string,
    public readonly body: unknown,
    public readonly actor: AdminActor,
  ) {}
}
