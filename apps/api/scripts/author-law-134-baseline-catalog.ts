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

// The worker evaluates only evidence-backed verified-profile facts. Each rule
// below is deliberately narrow: it represents an applicable obligation, not a
// conclusion that the obligation has been satisfied.
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
      {
        field: "riskDocumentationEvidence",
        expectedValue: "NOT_DETERMINABLE_FROM_CODE",
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
  const apiUrl = process.env.LCSP_API_URL ?? "http://127.0.0.1:8080";
  const token = process.env.LCSP_SESSION_TOKEN ?? process.env.TOKEN;
  const corpusVersionId = process.env.LEGAL_CORPUS_VERSION_ID;
  const version = process.env.LEGAL_RULE_CATALOG_VERSION;

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
      },
      null,
      2,
    ),
  );
}

void main();
