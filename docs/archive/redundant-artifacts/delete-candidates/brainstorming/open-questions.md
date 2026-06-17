# Open Questions

## Priority 1 - Wizard Simplicity vs Completeness

This is the highest-risk assumption because Manager is the entry point for LCSP. If the Wizard is too technical, Manager cannot complete it. If it is too shallow, Reconciliation and Risk Classification will be built on a weak WizardProfile.

### Questions

- What is the minimum business/legal truth required before technical evidence can be interpreted correctly?
- Which questions must Manager answer directly, and which should be inferred or deferred to Developer?
- How should Wizard questions avoid technical terms like model call, dependency, CI, scanner, repo, API probe or AST?
- What fields are critical for risk classification: sector, user group, affected rights, data type, AI purpose, decision role, human review, external LLM, biometric use?
- Which fields can be optional without weakening VerifiedProfile?
- How should the Wizard explain "human review" so Manager distinguishes real approval from rubber-stamp review?
- How should the Wizard ask about automated decisions without requiring Manager to understand code flow?
- Should the Wizard include examples by domain: finance, healthcare, HR, chatbot, biometric, internal productivity?
- What should happen when Manager selects "I don't know" for a critical business/legal field?
- How many steps/questions can the Wizard contain before Manager completion rate drops?

### Validation Tasks

- Prototype Wizard question set for 3 scenarios: public chatbot, credit scoring, internal HR screening.
- Test whether non-technical users can answer without Developer help.
- Mark each Wizard field as required, optional, inferred, or Developer-assisted.
- Map every required Wizard field to risk criteria, reconciliation use, or document output.

## Priority 2 - Legal Corpus and Rule Reliability

LCSP cannot rely on LLM reasoning alone. Classification must be grounded in versioned legal corpus, structured compliance rules, citations and traceable risk criteria.

### Questions

- Which legal documents are mandatory for MVP corpus?
- What is the minimum rule schema for risk classification and gap analysis?
- Which rules are hard-block rules versus advisory obligations?
- How should every rule map to legal_ref, risk_level, role, condition, requirement and priority?
- How are legal corpus versions pinned to each assessment?
- How does LCSP prevent citations outside retrieved/legal-approved chunks?
- Who reviews and approves compliance rules before they are used?
- How should rule changes trigger reassessment or stale report warnings?
- What evaluation dataset is required to test classification accuracy and citation accuracy?
- What happens when legal corpus is incomplete for a scenario?

### Validation Tasks

- Define MVP legal corpus inventory.
- Draft sample `compliance_rules.csv` for 10-20 representative rules.
- Create 5-10 scenario fixtures with expected risk, rules and citations.
- Define rule versioning and assessment pinning behavior.

## Priority 3 - Human Attestation Abuse Risk

Structured human technical attestation is useful when scanner evidence is weak, but it can become a "skip scanner" path if not governed carefully.

### Questions

- Which claims may Developer attest, and which require machine-generated evidence or external document?
- Which claims require both Manager and Developer confirmation?
- How should LCSP detect excessive use of attestation over scanner evidence?
- Should attestation lower final confidence or add a report disclosure?
- Should attestation require supporting evidence refs, or can it stand alone for some claims?
- How does LCSP prevent Manager from using business confirmation to override technical uncertainty?
- How does LCSP prevent Developer from attesting legal/business meaning?
- What audit fields are mandatory for each attestation?
- Should repeated attestation on critical claims trigger reviewer warning?
- Should final reports using attestation be marked differently from reports using strong automated scanner evidence?

### Validation Tasks

- Define attestation claim schema.
- Define role-policy checks for Manager and Developer.
- Define list of human-attestation-only disallowed fields.
- Add report disclosure text for classifications using attestation.

## Other Open Questions

### Evidence Collection

- Is GitHub App read-only acceptable for target MVP users?
- What exact permissions should the GitHub App request?
- What is the fallback UX when a customer refuses GitHub access?
- What minimum manual JSON upload format should be accepted in P1?
- How should API probe evidence be represented and trusted?

### Evidence Quality and Scoring

- Are the initial `0.60`, `0.75` and `0.85` thresholds appropriate?
- Should thresholds vary by scenario criticality from day one?
- What should scope coverage mean for a monorepo?
- How should stale evidence be handled when commit or branch changes?
- How should LCSP combine scanner evidence, API probe evidence and attestation?

### Reconciliation

- What conflict explanations are understandable to Manager without exposing raw code?
- What conflict explanations are actionable for Developer without leaking unnecessary business data?
- What is the exact sequence for dual-confirmation conflicts?
- Can Manager edit WizardProfile after Developer evidence arrives?
- Should every conflict resolution create a new VerifiedProfile version?

### Report and Audit

- What can be exported in readiness-only mode?
- What report disclosure is required when classification used human technical attestation?
- What audit fields are mandatory for evidence upload, scan, conflict resolution, attestation and final approval?
- How should report status differ between `FINAL_CANDIDATE`, `REPORT_READY` and exported final dossier?

### Product Brief Readiness

- What user segment should the Product Brief optimize first: SME/startup or compliance-heavy enterprise?
- What is the first scenario to demonstrate end-to-end: public chatbot, credit scoring or internal AI tool?
- Which assumptions must be validated by interview versus prototype versus evaluation dataset?
