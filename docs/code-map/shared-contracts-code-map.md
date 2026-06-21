# Shared Contracts Code Map

## Purpose

Define the shared contracts package ownership before creating files.

## Folder Layout

```text
packages/contracts/src/
  ids.ts
  enums/
    roles.ts
    assessment-state.ts
    scanner.ts
    ai-usage-flow.ts
  api/
    auth.dto.ts
    assessment.dto.ts
    wizard.dto.ts
    github.dto.ts
    scan.dto.ts
    reconciliation.dto.ts
    classification.dto.ts
    document.dto.ts
  events/
    envelope.ts
    repository.events.ts
    scan.events.ts
    technical-profile.events.ts
    ai-usage-flow.events.ts
    reconciliation.events.ts
    legal-matching.events.ts
    classification.events.ts
    document.events.ts
  domain/
    scanner.contracts.ts
    ai-usage-flow.contracts.ts
    legal-matching.contracts.ts
```

## Ownership

| Contract Area | Purpose | Used By |
|---|---|---|
| `ids.ts` | Shared ID aliases and correlation IDs. | API, workers, scanner. |
| `enums/assessment-state.ts` | Assessment lifecycle states. | API, workers, UI. |
| `api/*.dto.ts` | HTTP request/response contracts. | API, frontend. |
| `events/*.events.ts` | RabbitMQ payload contracts. | API, workers. |
| `domain/scanner.contracts.ts` | Scanner facts/findings/report contracts. | Scanner, TechnicalProfile, AIUsageFlow. |
| `domain/ai-usage-flow.contracts.ts` | AIUsageFlow claim/rule contracts. | AIUsageFlow, Reconciliation, Classification. |
| `domain/legal-matching.contracts.ts` | Rule/citation match contracts. | Legal Matching, Classification, Document. |

## Contract Rule

Do not define DTOs independently inside feature modules when the DTO crosses a process, package, or service boundary. Put shared contracts here.
