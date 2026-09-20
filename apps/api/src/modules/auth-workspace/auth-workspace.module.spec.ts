import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { describe, expect, it } from "@jest/globals";
import { RbacModule } from "../../platform/rbac/rbac.module.js";
import {
  AUTH_WORKSPACE_AUDIT_EVENT_REPOSITORY,
  AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY,
  AUTH_WORKSPACE_MFA_ENROLLMENT_REPOSITORY,
  AUTH_WORKSPACE_MFA_OTP_USED_REPOSITORY,
  AUTH_WORKSPACE_MFA_RATE_LIMIT_REPOSITORY,
  AUTH_WORKSPACE_MFA_RECOVERY_CODE_REPOSITORY,
  AUTH_WORKSPACE_OAUTH_IDENTITY_REPOSITORY,
  AUTH_WORKSPACE_OAUTH_STATE_REPOSITORY,
  AUTH_WORKSPACE_RECOVERY_REQUEST_REPOSITORY,
  AUTH_WORKSPACE_SESSION_REPOSITORY,
  AUTH_WORKSPACE_USER_REPOSITORY,
} from "./application/ports/persistence/index.ts";
import { AuthWorkspaceModule } from "./auth-workspace.module.ts";

describe("AuthWorkspaceModule CQRS registration", () => {
  it("initializes without TypeError in CQRS CommandBus", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RbacModule,
        AuthWorkspaceModule,
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    expect(app).toBeDefined();
    await app.close();
  });

  it("exports all 11 granular persistence port tokens for consumer modules", async () => {
    const ALL_11_TOKENS = [
      AUTH_WORKSPACE_USER_REPOSITORY,
      AUTH_WORKSPACE_SESSION_REPOSITORY,
      AUTH_WORKSPACE_AUDIT_EVENT_REPOSITORY,
      AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY,
      AUTH_WORKSPACE_MFA_ENROLLMENT_REPOSITORY,
      AUTH_WORKSPACE_MFA_RATE_LIMIT_REPOSITORY,
      AUTH_WORKSPACE_MFA_OTP_USED_REPOSITORY,
      AUTH_WORKSPACE_MFA_RECOVERY_CODE_REPOSITORY,
      AUTH_WORKSPACE_RECOVERY_REQUEST_REPOSITORY,
      AUTH_WORKSPACE_OAUTH_STATE_REPOSITORY,
      AUTH_WORKSPACE_OAUTH_IDENTITY_REPOSITORY,
    ];

    @Module({
      imports: [AuthWorkspaceModule],
    })
    class ConsumerTestModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RbacModule,
        ConsumerTestModule,
      ],
    }).compile();

    for (const token of ALL_11_TOKENS) {
      const resolved: unknown = moduleRef.get(token);
      expect(resolved).toBeDefined();
    }
  });
});
