import { AUTH_ERROR_CODES, createProblemResult } from "@lcsp/contracts/auth";

import { EmailAddress } from "../../../domain/value-objects/email-address.value-object.ts";
import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { UpdateProfileSuccess } from "../../contracts/auth-workspace/profile.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import {
  type UpdateProfilePayload,
  UpdateProfileCommand,
} from "./update-profile.command.ts";

const MAX_DISPLAY_NAME_LENGTH = 120;

export class UpdateProfileHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: AuthWorkspaceRepositories,
  ) {}

  async execute(
    command: UpdateProfileCommand,
  ): Promise<AuthProblemResult | UpdateProfileSuccess> {
    const { payload, requestMeta } = command;
    const correlationId =
      requestMeta.correlation_id ?? this.support.createCorrelationId();

    const sessionToken = payload.session_token;
    if (!sessionToken) {
      return createProblemResult(AUTH_ERROR_CODES.authRequired, correlationId);
    }

    const session = await this.support.findValidSession(
      this.repositories,
      sessionToken,
    );
    if (!session) {
      return createProblemResult(
        AUTH_ERROR_CODES.sessionInvalid,
        correlationId,
      );
    }

    if (!this.hasUpdateField(payload)) {
      return createProblemResult(
        AUTH_ERROR_CODES.validationFailed,
        correlationId,
      );
    }

    if (
      typeof payload.display_name === "string" &&
      payload.display_name.trim().length > MAX_DISPLAY_NAME_LENGTH
    ) {
      return createProblemResult(
        AUTH_ERROR_CODES.validationFailed,
        correlationId,
      );
    }

    if (typeof payload.recovery_email === "string") {
      const trimmed = payload.recovery_email.trim();
      if (trimmed.length > 0 && !EmailAddress.isValid(trimmed)) {
        return createProblemResult(
          AUTH_ERROR_CODES.validationFailed,
          correlationId,
        );
      }
    }

    const user = await this.support.resolveUserById(
      this.repositories,
      session.userId,
    );
    if (!user) {
      return createProblemResult(
        AUTH_ERROR_CODES.sessionInvalid,
        correlationId,
      );
    }

    const mfaEnrollment = await this.support.findMfaEnrollment(
      this.repositories,
      session.userId,
    );
    const organization = await this.support.resolveOrganizationById(
      this.repositories,
      session.organizationId,
    );
    const mfaRequired = this.support.isMfaRequired(
      user,
      organization,
      mfaEnrollment,
    );
    if (mfaRequired && !session.isMfaVerified()) {
      return createProblemResult(AUTH_ERROR_CODES.mfaRequired, correlationId);
    }

    const updatedFields: string[] = [];

    if (typeof payload.display_name === "string") {
      user.displayName = payload.display_name.trim() || null;
      updatedFields.push("display_name");
    }

    if (typeof payload.recovery_email === "string") {
      user.recoveryEmail = payload.recovery_email.trim().toLowerCase() || null;
      updatedFields.push("recovery_email");
    }

    await this.repositories.users.save(user);

    await this.support.recordAudit(this.repositories, {
      event_type: "auth.profile.updated",
      actor_id: user.id,
      organization_id: session.organizationId,
      decision: "allow",
      updated_fields: updatedFields,
      correlation_id: correlationId,
    });

    return {
      ok: true,
      correlation_id: correlationId,
      updated_fields: updatedFields,
    };
  }

  private hasUpdateField(payload: UpdateProfilePayload): boolean {
    return (
      typeof payload.display_name === "string" ||
      typeof payload.recovery_email === "string"
    );
  }
}
