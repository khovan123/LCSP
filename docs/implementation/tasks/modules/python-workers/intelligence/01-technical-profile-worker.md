---
task_id: MW-intel-001
module: python-workers/intelligence
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 3.6
depends_on:
  - python-workers/scanner/04-evidence-report-assembly.md
  - python-workers/platform/01-worker-platform-bootstrap.md
---

# TechnicalProfile Worker

## Outcome

Consume `scan.evidence-accepted` events and produce a `TechnicalProfile` from the accepted `TechnicalEvidenceReport`. Profile summarizes evidence quality, coverage, AI usage signals, and dependency risks. No LLM calls — pure structured analysis of evidence payload.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/intelligence/__init__.py` | Create | Package init |
| `lcsp-python-workers/src/lcsp_workers/intelligence/technical_profile_consumer.py` | Create | `ConsumerBase` subclass for `scan.evidence-accepted` |
| `lcsp-python-workers/src/lcsp_workers/intelligence/technical_profile_builder.py` | Create | Evidence → TechnicalProfile logic |
| `lcsp-python-workers/src/lcsp_workers/intelligence/evidence_quality_evaluator.py` | Create | Evidence quality and actionability assessment |

## RabbitMQ

| Attribute | Value |
|---|---|
| Queue | `intelligence.evidence-accepted` |
| Routing key | `scan.evidence-accepted` |
| PBAC preflight | No (system event, no user context) |

## TechnicalProfile Schema

```python
@dataclass
class TechnicalProfile:
    schema_version: str
    provider_version: str                     # Worker version
    evidence_report_id: str
    assessment_id: str
    organization_id: str

    # Evidence quality
    evidence_quality: str                     # 'high' | 'medium' | 'low' | 'insufficient'
    coverage_notes: list[str]                 # Business-language limitations
    tool_coverage: dict[str, bool]            # { 'syft': True, 'semgrep': False, ... }

    # AI usage signals summary
    ai_usage_signal_count: int
    signal_types_detected: list[str]          # ['provider_integration', 'model_call', ...]
    dependency_ai_packages: list[str]         # Package names only (from SBOM)

    # Privacy flags
    privacy_flags: PrivacyFlags
```

## Business Rules

1. Listen on `scan.evidence-accepted`. Fetch `TechnicalEvidenceReport` from NestJS API.
2. Evaluate evidence quality: `high` if all tools succeeded and AI signals found; `medium` if partial coverage; `low` if no AI signals; `insufficient` if critical tools all failed.
3. `dependency_ai_packages` extracted from SBOM entries where package name matches AI package list (e.g., `openai`, `anthropic`, `langchain`, `autogen`, `llama-index`).
4. `signal_types_detected` deduplicated list from `ai_usage_signals`.
5. No LLM calls in this worker.
6. `privacy_flags.contains_source_code = False` asserted before callback.
7. Submit to `POST /internal/evidence/technical-profile-callback` via `WorkerApiClient`.
8. `provider_version` = this worker's version (pinned).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Evidence with AI signals | `evidence_quality = high`, signals populated |
| T02 | Evidence with no AI signals | `evidence_quality = low` |
| T03 | Syft failed, Semgrep passed | `evidence_quality = medium`, tool_coverage noted |
| T04 | All tools failed | `evidence_quality = insufficient` |
| T05 | SBOM has `openai` package | `dependency_ai_packages` includes `openai` |
| T06 | Privacy flags asserted | `contains_source_code = False` verified |
| T07 | No LLM calls made | No LLM provider API calls in network trace |

## Definition of Done

- `TechnicalProfile` built from evidence without LLM calls.
- Evidence quality evaluated from tool coverage and signal presence.
- `dependency_ai_packages` from SBOM (names only, no versions in signal list).
- `contains_source_code = False` asserted before callback.
