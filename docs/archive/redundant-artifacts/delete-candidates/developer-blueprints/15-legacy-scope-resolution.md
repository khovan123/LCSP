# Legacy Scope Resolution

## Active Controlled MVP Scope

```text
OAuth/OIDC
Manager super-role
GitHub App repository scan
static technical evidence
AIUsageFlow
reconciliation
legal citation foundation
classification/gap/document shells
```

## Deferred Scope

```text
GitLab
API probing
CLI
GitHub Action
CI/CD checks
legal monitoring crawler
enterprise SSO/SAML/SCIM
production deployment
A2-b2
```

## Runtime Resolution

Older docs may describe a Python worker or Python LangGraph implementation. For controlled MVP prototype implementation, ADR-022 supersedes those references in developer execution blueprints:

```text
CONTROLLED_MVP_PROTOTYPE_RUNTIME = TYPESCRIPT_FIRST_NPM_WORKSPACES
```

Python semantic AST analysis is deferred. Python files receive Tree-sitter syntactic coverage only and must emit `LANGUAGE_COVERAGE_LIMITED` or `ANALYSIS_ABSTAINED` when the prototype cannot support a semantic claim.

## Non-Claims

The controlled MVP prototype does not claim production release, customer onboarding, legal compliance certification, formal legal reliability validation, runtime scanner accuracy or A2-b2 completion.
