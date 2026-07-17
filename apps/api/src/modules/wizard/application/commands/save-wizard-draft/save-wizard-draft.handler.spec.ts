import { Test, TestingModule } from "@nestjs/testing";
import { SaveWizardDraftHandler } from "./save-wizard-draft.handler.js";
import { SaveWizardDraftCommand } from "./save-wizard-draft.command.js";
import { WIZARD_PROFILE_REPOSITORY } from "../../ports/persistence/wizard-profile.repository.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { WizardProfileEntity } from "../../../domain/entities/wizard-profile.entity.js";
import {
  AssessmentNotFoundException,
  WizardAlreadySubmittedException,
} from "../../../domain/exceptions/wizard.exceptions.js";
import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";

describe("SaveWizardDraftHandler", () => {
  let handler: SaveWizardDraftHandler;
  let wizardRepository: any;
  let auditWriter: any;

  beforeEach(async () => {
    wizardRepository = {
      verifyAssessmentOwnership: jest.fn(),
      findByAssessmentId: jest.fn(),
      upsertDraft: jest.fn(),
    };
    auditWriter = {
      write: jest.fn(),
    };

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
      expect(upsertArg.status).toBe("IN_PROGRESS");
      expect(upsertArg.answers).toEqual({ question1: "answer1" });

      expect(auditWriter.write).toHaveBeenCalledWith({
        eventType: "WIZARD_DRAFT_SAVED",
        actorId: "owner-1",
        organizationId: "org-1",
        resourceType: "wizard_profile",
        resourceId: "wizard-id-1",
        decision: "allow",
        payload: {
          assessmentId: "assessment-123",
          wizardProfileId: "wizard-id-1",
          version: 1,
        },
        correlationId: "corr-id-1",
      });

      expect(result.wizard_profile_id).toBe("wizard-id-1");
      expect(result.status).toBe("IN_PROGRESS");
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
          status: "IN_PROGRESS",
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
      expect(upsertArg.answers).toEqual({ question1: "answer1" });

      expect(result.version).toBe(3);
    });

    it("T03: should throw WizardAlreadySubmittedException if status is SUBMITTED", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(true);
      wizardRepository.findByAssessmentId.mockResolvedValue(
        new WizardProfileEntity({
          id: "wizard-id-3",
          assessmentId: "assessment-123",
          status: "SUBMITTED",
        }),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        WizardAlreadySubmittedException,
      );
      expect(wizardRepository.upsertDraft).not.toHaveBeenCalled();
      expect(auditWriter.write).not.toHaveBeenCalled();
    });

    it("T04: should throw AssessmentNotFoundException if ownership verification fails", async () => {
      wizardRepository.verifyAssessmentOwnership.mockResolvedValue(false); // Verification failed

      await expect(handler.execute(command)).rejects.toThrow(
        AssessmentNotFoundException,
      );
      expect(wizardRepository.findByAssessmentId).not.toHaveBeenCalled();
    });
  });
});
