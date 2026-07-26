import { Test, type TestingModule } from "@nestjs/testing";
import { jest } from "@jest/globals";
import { CitationLocatorValidatorService } from "./citation-locator-validator.service.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";

describe("CitationLocatorValidatorService", () => {
  let service: CitationLocatorValidatorService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prisma = {
      // Mock any prisma delegates here when implemented
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitationLocatorValidatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CitationLocatorValidatorService>(
      CitationLocatorValidatorService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return successfully (stubbed)", async () => {
    // Currently the service is just stubbed and returns without doing anything
    await expect(
      service.validateAll([
        {
          legalCorpusVersionId: "v1",
          documentId: "doc1",
          locator: "loc1",
        },
      ]),
    ).resolves.toBeUndefined();
  });
});
