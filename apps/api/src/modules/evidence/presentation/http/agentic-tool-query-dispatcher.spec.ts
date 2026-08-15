import { AGENTIC_TOOL_NAMES } from "@lcsp/contracts/evidence";

import { GetGapRequirementsQuery } from "../../../classification/application/queries/get-gap-requirements/get-gap-requirements.query.js";
import { GetAdminSourceCatalogQuery } from "../../../legal-rule-catalog/application/queries/get-admin-source-catalog/get-admin-source-catalog.query.js";
import { CompareWizardClaimQuery } from "../../../reconciliation/application/queries/compare-wizard-claim/compare-wizard-claim.query.js";
import { SearchEvidenceQuery } from "../../application/queries/search-evidence/search-evidence.query.js";
import { buildAgenticToolQuery } from "./agentic-tool-query-dispatcher.js";

const baseArgs = {
  assessmentId: "assessment-1",
  organizationId: "org-1",
  userId: "user-1",
  correlationId: "correlation-1",
  artifactVersions: {
    wizardProfileId: "wizard-1",
    technicalEvidenceReportId: "ter-1",
  },
};

describe("buildAgenticToolQuery", () => {
  it("keeps search_evidence mapped to SearchEvidenceQuery", () => {
    const query = buildAgenticToolQuery({
      ...baseArgs,
      toolName: AGENTIC_TOOL_NAMES.searchEvidence,
      input: { maxResults: 10 },
    });

    expect(query).toBeInstanceOf(SearchEvidenceQuery);
  });

  it("routes compare_wizard_claim through the central query table", () => {
    const query = buildAgenticToolQuery({
      ...baseArgs,
      toolName: AGENTIC_TOOL_NAMES.compareWizardClaim,
      input: {
        targetId: "target:abcdefgh",
        claimField: "PROVIDER",
        expectedValue: "OPENAI",
        comparisonScope: "TARGET",
        maxEvidenceRefs: 10,
      },
    });

    expect(query).toBeInstanceOf(CompareWizardClaimQuery);
    expect(query).toMatchObject({
      assessmentId: "assessment-1",
      organizationId: "org-1",
      wizardProfileId: "wizard-1",
      evidenceReportId: "ter-1",
      targetId: "target:abcdefgh",
      claimField: "PROVIDER",
      expectedValue: "OPENAI",
      comparisonScope: "TARGET",
      maxEvidenceRefs: 10,
    });
  });

  it("routes get_gap_requirements through GetGapRequirementsQuery", () => {
    const input = {
      classificationRef: "classification:abcdefgh",
      policyProfileVersionId: "policy_abcdefgh",
    };
    const query = buildAgenticToolQuery({
      ...baseArgs,
      toolName: AGENTIC_TOOL_NAMES.getGapRequirements,
      input,
    });

    expect(query).toBeInstanceOf(GetGapRequirementsQuery);
    expect(query).toMatchObject({
      assessmentId: "assessment-1",
      organizationId: "org-1",
      input,
      actorId: "user-1",
    });
  });

  it("routes get_admin_source_catalog through GetAdminSourceCatalogQuery", () => {
    const input = { catalogId: "catalog_vbpl" };
    const query = buildAgenticToolQuery({
      ...baseArgs,
      toolName: AGENTIC_TOOL_NAMES.getAdminSourceCatalog,
      input,
    });

    expect(query).toBeInstanceOf(GetAdminSourceCatalogQuery);
    expect(query).toMatchObject({
      assessmentId: "assessment-1",
      organizationId: "org-1",
      input,
      actorId: "user-1",
    });
  });

  it("fails closed for an unregistered tool name", () => {
    expect(() =>
      buildAgenticToolQuery({
        ...baseArgs,
        toolName: "unknown_tool",
        input: {},
      }),
    ).toThrow();
  });
});
