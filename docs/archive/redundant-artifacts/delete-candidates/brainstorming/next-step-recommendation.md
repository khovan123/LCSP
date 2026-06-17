# Next Step Recommendation

## Recommendation

LCSP can move to Product Brief next, but not directly to PRD, architecture or backlog.

The Product Brief should preserve the current evidence-based product stance and carry forward the top assumptions as validation tasks.

## Why Product Brief Is Appropriate Now

Enough product direction is clear:

- LCSP is an evidence-based compliance support platform, not a generic legal chatbot.
- Manager is the assessment owner.
- Developer participates through task-based technical evidence responsibilities.
- Wizard-only cannot produce risk level.
- Risk Classification requires technical evidence, reconciliation and VerifiedProfile.
- GitHub App read-only is the default MVP evidence path, with Local/CI as enterprise-safe alternative.
- Conflict handling uses dual confirmation for material conflicts.

## Do Not Start Yet

Do not start these artifacts yet:

- PRD
- Architecture document
- Backlog
- Implementation plan
- Code

The problem framing is now clear enough for a Product Brief, but not yet specific enough for build planning.

## Conditions for Product Brief

The Product Brief should explicitly include:

- Target user: Manager as primary entry point, Developer as task participant.
- Product promise: evidence-based compliance assessment, not legal advice.
- Non-goal: Wizard-only risk classification.
- MVP evidence path: GitHub App read-only default.
- Enterprise path: Local/CI/manual evidence as alternative.
- Gating principle: no risk level without technical evidence and VerifiedProfile.
- Reconciliation principle: Manager owns business/legal truth, Developer owns technical truth.
- Top validation risks: Wizard simplicity, legal rules reliability, attestation abuse.

## Recommended Product Brief Sections

- Problem statement
- Target users and roles
- Core workflow
- Evidence-based classification principle
- MVP scope and non-goals
- Key decision candidates
- High-risk assumptions
- Validation plan
- Success criteria

## Validation Tasks Before PRD

Before writing PRD, validate:

1. Wizard question set can collect enough business/legal truth without technical wording.
2. Legal corpus/rule schema can support cited, traceable classification.
3. Human technical attestation cannot be abused as a generic override.
4. GitHub App read-only default is acceptable for demo/SME users.
5. Evidence gate statuses are understandable to Manager and Developer.

## Suggested Next BMAD Step

Move to Product Brief creation next, using these brainstorming artifacts as source material:

- `brainstorming-summary.md`
- `open-questions.md`
- `decision-candidates.md`
- `next-step-recommendation.md`

Recommended stance:

```text
Proceed to Product Brief with explicit open assumptions.
Do not proceed to PRD until the Wizard question model and evidence gate model are validated.
```
