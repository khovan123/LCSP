import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SaveWizardDraftHandler } from "./save-wizard-draft.handler.js";
import { SaveWizardDraftCommand } from "./save-wizard-draft.command.js";
import {
  WIZARD_PROFILE_REPOSITORY,
  type WizardProfileRepository,
} from "../../ports/persistence/wizard-profile.repository.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { WizardProfileEntity } from "../../../domain/entities/wizard-profile.entity.js";
import {
  AssessmentNotFoundException,
  WizardAlreadySubmittedException,
} from "../../../domain/exceptions/wizard.exceptions.js";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";

import { jest } from "@jest/globals";

describe("SaveWizardDraftHandler", () => {
  let handler: SaveWizardDraftHandler;
  let wizardRepository: jest.Mocked<WizardProfileRepository>;
  let auditWriter: jest.Mocked<AuditWriterService>;

  beforeEach(async () => {
    wizardRepository = {
      verifyAssessmentOwnership:
        jest.fn<WizardProfileRepository["verifyAssessmentOwnership"]>(),
      findByAssessmentId:
        jest.fn<WizardProfileRepository["findByAssessmentId"]>(),
      upsertDraft: jest.fn<WizardProfileRepository["upsertDraft"]>(),
    };
    auditWriter = {
      write: jest.fn<AuditWriterService["write"]>(),
    } as unknown as jest.Mocked<AuditWriterService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveWizardDraftHandler,
        { provide: WIZARD_PROFILE_REPOSITORY, useValue: wizardRepository },
        { provide: AuditWriterService, useValue: auditWriter },
      ],
    }).compile();

    handler = module.get<SaveWizardDraftHandler>(SaveWizardDraftHandler);
  });

  describe("execute", () => {
    const command = new SaveWizardDraftCommand(
      "assessment-123",
      "org-1",
      "owner-1",
      { question1: "answer1" },
      "corr-id-1",
      {
        subjectRole: SUBJECT_ROLES.manager,
        selectedAction: PBAC_ACTIONS.wizardWrite,
        policyId: "policy-manager-workspace",
        policyVersion: "2026-06-26",
      },
    );

    it("T01: should create a new draft if none exists and log audit event", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(true);
      wizardRepository.findByAssessmentId.mockResolvedValue(null);
      wizardRepository.upsertDraft.mockImplementation((profile) => {
        // mock return what we passed in with some generated fields
        return Promise.resolve(
          new WizardProfileEntity({
            ...profile,
            id: "wizard-id-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      });

      const result = await handler.execute(command);

      expect(wizardRepository.verifyAssessmentOwnership).toHaveBeenCalledWith(
        "assessment-123",
        "org-1",
        "owner-1",
      );
      expect(wizardRepository.findByAssessmentId).toHaveBeenCalledWith(
        "assessment-123",
      );
      expect(wizardRepository.upsertDraft).toHaveBeenCalled();

      const upsertArg = wizardRepository.upsertDraft.mock.calls[0][0];
      expect(upsertArg.version).toBe(1);
      expect(upsertArg.status).toBe(WIZARD_STATUS_CODES.inProgress);
      expect(upsertArg.answers).toEqual({ question1: "answer1" });

      expect(auditWriter.write).toHaveBeenCalledWith({
        eventType: WIZARD_EVENT_TYPES.draftSaved,
        actorId: "owner-1",
        organizationId: "org-1",
        resourceType: "wizard_profile",
        resourceId: "wizard-id-1",
        decision: AUDIT_DECISIONS.allow,
        payload: {
          assessmentId: "assessment-123",
          wizardProfileId: "wizard-id-1",
          version: 1,
        },
        correlationId: "corr-id-1",
        policyId: "policy-manager-workspace",
        policyVersion: "2026-06-26",
      });

      expect(result.wizard_profile_id).toBe("wizard-id-1");
      expect(result.status).toBe(WIZARD_STATUS_CODES.inProgress);
      expect(result.version).toBe(1);
      expect(result.correlation_id).toBe("corr-id-1");
    });

    it("T02: should update an existing IN_PROGRESS draft and bump version", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(true);
      wizardRepository.findByAssessmentId.mockResolvedValue(
        new WizardProfileEntity({
          id: "wizard-id-2",
          assessmentId: "assessment-123",
          organizationId: "org-1",
          ownerId: "owner-1",
          version: 2,
          status: WIZARD_STATUS_CODES.inProgress,
          answers: { oldQuestion: "oldAnswer" },
        }),
      );
      wizardRepository.upsertDraft.mockImplementation((p) =>
        Promise.resolve(
          new WizardProfileEntity({
            ...p,
            updatedAt: new Date(),
          }),
        ),
      );

      const result = await handler.execute(command);

      expect(wizardRepository.upsertDraft).toHaveBeenCalled();
      const upsertArg = wizardRepository.upsertDraft.mock.calls[0][0];
      expect(upsertArg.version).toBe(3); // Bumped from 2
      // T07: Partial save preserves existing answers
      expect(upsertArg.answers).toEqual({
        oldQuestion: "oldAnswer",
        question1: "answer1",
      });
      expect(result.version).toBe(3);
    });

    it("T03: should throw WizardAlreadySubmittedException if status is SUBMITTED", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(true);
      wizardRepository.findByAssessmentId.mockResolvedValue(
        new WizardProfileEntity({
          id: "wizard-id-3",
          assessmentId: "assessment-123",
          status: WIZARD_STATUS_CODES.submitted,
        }),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        WizardAlreadySubmittedException,
      );
      expect(wizardRepository.upsertDraft).not.toHaveBeenCalled();
      expect(auditWriter.write).not.toHaveBeenCalled();
    });

    it("T05: should throw AssessmentNotFoundException if ownership verification fails", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(false); // Verification failed

      await expect(handler.execute(command)).rejects.toThrow(
        AssessmentNotFoundException,
      );
      expect(wizardRepository.findByAssessmentId).not.toHaveBeenCalled();
    });

    it("T08: should not include answers in the audit payload", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(true);
      wizardRepository.findByAssessmentId.mockResolvedValue(null);
      wizardRepository.upsertDraft.mockImplementation((profile) => {
        return Promise.resolve(
          new WizardProfileEntity({
            ...profile,
            id: "wizard-id-4",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );
      });

      await handler.execute(command);

      const auditArg = auditWriter.write.mock.calls[0][0];
      expect(auditArg.payload?.answers).toBeUndefined();
      expect(auditArg.payload).toEqual({
        assessmentId: "assessment-123",
        wizardProfileId: "wizard-id-4",
        version: 1,
      });
    });

    it("denies service-level draft save when PBAC context is not Manager wizard:write", async () => {
      await expect(
        handler.execute(
          new SaveWizardDraftCommand(
            "assessment-123",
            "org-1",
            "developer-1",
            { question1: "answer1" },
            "corr-deny",
            {
              subjectRole: SUBJECT_ROLES.developer,
              selectedAction: PBAC_ACTIONS.wizardWrite,
              policyId: "policy-developer",
              policyVersion: "2026-06-26",
            },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(wizardRepository.verifyAssessmentOwnership).not.toHaveBeenCalled();
      expect(wizardRepository.upsertDraft).not.toHaveBeenCalled();
      expect(auditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: WIZARD_EVENT_TYPES.draftSaved,
          actorId: "developer-1",
          organizationId: "org-1",
          resourceType: "wizard_profile",
          resourceId: null,
          decision: AUDIT_DECISIONS.deny,
          reasonCode: AUTH_ERROR_CODES.pbacDenied,
          correlationId: "corr-deny",
          policyId: "policy-developer",
          policyVersion: "2026-06-26",
        }),
      );
    });
  });
});
