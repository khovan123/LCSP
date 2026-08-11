type Fact = {
  field: string;
  expectedValue: unknown;
};

type Citation = {
  locator: string;
};

type Rule = {
  legalRuleId: string;
  ruleFamily: string;
  requiredFacts: Fact[];
  citations: Citation[];
};

type ResultEnvelope<T> = {
  ok: boolean;
  data?: T;
  problem?: { code?: string; detailKey?: string };
};

const documentId = "LAW-134-2025-QH15";
const unknownFactPolicy = "BLOCK_ON_UNKNOWN";
const unknownValues = new Set([
  "UNKNOWN",
  "UNCLEAR",
  "NOT_DETERMINABLE_FROM_CODE",
]);

// These are authoring candidates, not legal conclusions. The script deliberately
// leaves the catalog in DRAFT unless approval is explicitly requested after the
// applicability logic and legal-role scope have been reviewed.
const rules: Rule[] = [
  {
    legalRuleId: "LAW-134-2025-QH15-ART-9-HIGH-RISK-IMPACT",
    ruleFamily: "AI_RISK_CLASSIFICATION",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
    ],
    citations: [{ locator: "art-9::cl-1::pt-a" }, { locator: "art-9::cl-2" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-10-HIGH-RISK-CLASSIFICATION",
    ruleFamily: "AI_RISK_CLASSIFICATION",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
    ],
    citations: [{ locator: "art-10::cl-1" }, { locator: "art-10::cl-3" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-10-HIGH-RISK-SUPERVISION",
    ruleFamily: "AI_RISK_SUPERVISION",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
    ],
    citations: [{ locator: "art-10::cl-5::pt-a" }, { locator: "art-10::cl-6" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-11-INTERACTION-DISCLOSURE-GAP",
    ruleFamily: "AI_TRANSPARENCY",
    requiredFacts: [
      { field: "aiInteractionDisclosurePresent", expectedValue: "ABSENT" },
    ],
    citations: [{ locator: "art-11::cl-1" }, { locator: "art-11::cl-5" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-11-CONTENT-LABELING-GAP",
    ruleFamily: "AI_TRANSPARENCY",
    requiredFacts: [
      { field: "contentLabelingStatus", expectedValue: "ABSENT" },
    ],
    citations: [{ locator: "art-11::cl-2" }, { locator: "art-11::cl-3" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-12-INCIDENT-HANDLING-GAP",
    ruleFamily: "AI_INCIDENT_MANAGEMENT",
    requiredFacts: [
      { field: "incidentHandlingPresent", expectedValue: "ABSENT" },
    ],
    citations: [{ locator: "art-12::cl-1" }, { locator: "art-12::cl-2" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-13-HIGH-RISK-CONFORMITY",
    ruleFamily: "AI_CONFORMITY_ASSESSMENT",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
    ],
    citations: [{ locator: "art-13::cl-1" }, { locator: "art-13::cl-3" }],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-14-HIGH-RISK-RISK-MANAGEMENT",
    ruleFamily: "AI_HIGH_RISK_GOVERNANCE",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
    ],
    citations: [
      { locator: "art-14::cl-1::pt-a" },
      { locator: "art-14::cl-1::pt-c" },
    ],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-14-HIGH-RISK-HUMAN-OVERSIGHT-GAP",
    ruleFamily: "AI_HIGH_RISK_GOVERNANCE",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
      { field: "interventionControlPresent", expectedValue: "ABSENT" },
    ],
    citations: [
      { locator: "art-14::cl-1::pt-d" },
      { locator: "art-14::cl-2::pt-b" },
    ],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-14-HIGH-RISK-INCIDENT-GAP",
    ruleFamily: "AI_HIGH_RISK_GOVERNANCE",
    requiredFacts: [
      {
        field: "potentialHarmCategories",
        expectedValue: ["POTENTIAL_HIGH_IMPACT"],
      },
      { field: "incidentHandlingPresent", expectedValue: "ABSENT" },
    ],
    citations: [
      { locator: "art-14::cl-1::pt-đ" },
      { locator: "art-14::cl-2::pt-d" },
    ],
  },
  {
    legalRuleId: "LAW-134-2025-QH15-ART-15-MEDIUM-RISK-TRANSPARENCY-GAP",
    ruleFamily: "AI_MEDIUM_RISK_GOVERNANCE",
    requiredFacts: [
      { field: "aiInteractionDisclosurePresent", expectedValue: "ABSENT" },
    ],
    citations: [
      { locator: "art-9::cl-1::pt-b" },
      { locator: "art-15::cl-1::pt-a" },
    ],
  },
];

function validateCandidateRules(): void {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (!rule.legalRuleId.trim() || ids.has(rule.legalRuleId)) {
      throw new Error(`Duplicate or empty legalRuleId: ${rule.legalRuleId}`);
    }
    ids.add(rule.legalRuleId);

    if (!rule.ruleFamily.trim()) {
      throw new Error(`${rule.legalRuleId}: ruleFamily is required`);
    }
    if (rule.requiredFacts.length === 0) {
      throw new Error(
        `${rule.legalRuleId}: at least one required fact is required`,
      );
    }
    if (rule.citations.length === 0) {
      throw new Error(`${rule.legalRuleId}: at least one citation is required`);
    }

    for (const fact of rule.requiredFacts) {
      if (!fact.field.trim()) {
        throw new Error(`${rule.legalRuleId}: required fact field is empty`);
      }
      if (
        typeof fact.expectedValue === "string" &&
        unknownValues.has(fact.expectedValue.trim().toUpperCase())
      ) {
        throw new Error(
          `${rule.legalRuleId}: unknown value ${fact.expectedValue} cannot be authored as a positive required fact`,
        );
      }
    }

    for (const citation of rule.citations) {
      if (!/^art-\d+(?:::[a-z]+-[^:]+)*$/u.test(citation.locator)) {
        throw new Error(
          `${rule.legalRuleId}: invalid citation locator ${citation.locator}`,
        );
      }
    }
  }
}

async function request<T>(
  url: string,
  token: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ResultEnvelope<T>;
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(
      `Request failed (${response.status}): ${payload.problem?.code ?? "UNKNOWN"}`,
    );
  }
  return payload.data;
}

async function main(): Promise<void> {
  validateCandidateRules();

  const apiUrl = process.env.LCSP_API_URL ?? "http://127.0.0.1:8080";
  const token = process.env.LCSP_SESSION_TOKEN ?? process.env.TOKEN;
  const corpusVersionId = process.env.LEGAL_CORPUS_VERSION_ID;
  const version = process.env.LEGAL_RULE_CATALOG_VERSION;
  const approveRequested = ["1", "true", "yes"].includes(
    (process.env.LEGAL_RULE_CATALOG_APPROVE ?? "").trim().toLowerCase(),
  );

  if (!token || !corpusVersionId || !version) {
    throw new Error(
      "TOKEN (or LCSP_SESSION_TOKEN), LEGAL_CORPUS_VERSION_ID, and LEGAL_RULE_CATALOG_VERSION are required",
    );
  }

  const catalog = await request<{ id: string }>(
    `${apiUrl}/internal/legal-rule-catalog/versions`,
    token,
    { version },
  );

  for (const rule of rules) {
    await request<{ id: string }>(
      `${apiUrl}/internal/legal-rule-catalog/rules`,
      token,
      {
        legalRuleId: rule.legalRuleId,
        legalRuleCatalogVersionId: catalog.id,
        ruleFamily: rule.ruleFamily,
        requiredFacts: rule.requiredFacts,
        optionalFacts: [],
        blockingFacts: [],
        unknownFactPolicy,
        citationLocatorRefs: rule.citations.map(({ locator }) => ({
          legalCorpusVersionId: corpusVersionId,
          documentId,
          locator,
        })),
      },
    );
  }

  if (!approveRequested) {
    console.log(
      JSON.stringify(
        {
          catalogVersionId: catalog.id,
          status: "DRAFT",
          ruleCount: rules.length,
          corpusVersionId,
          approval: "NOT_REQUESTED",
          reviewRequired:
            "Applicability logic, including provider/deployer/developer/user role scope, must be reviewed before approval.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const approved = await request<{ id: string; status: string }>(
    `${apiUrl}/internal/legal-rule-catalog/versions/${catalog.id}/approve`,
    token,
    {},
  );

  console.log(
    JSON.stringify(
      {
        catalogVersionId: approved.id,
        status: approved.status,
        ruleCount: rules.length,
        corpusVersionId,
        approval: "EXPLICITLY_REQUESTED",
      },
      null,
      2,
    ),
  );
}

void main();
