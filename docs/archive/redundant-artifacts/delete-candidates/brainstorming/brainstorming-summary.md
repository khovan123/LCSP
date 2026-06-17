# Brainstorming Summary

## Scope

Phiên brainstorming này làm rõ problem, workflow và trade-off của LCSP dựa trên `LCSP_Technical_Specification.html`. Đây chưa phải PRD, architecture document, backlog hay code plan.

## Core Problem

LCSP không chỉ là một checklist tuân thủ AI. Vấn đề cốt lõi là biến nghĩa vụ pháp lý khó diễn giải thành một workflow đánh giá có căn cứ, có technical evidence, có reconciliation giữa business/legal truth và technical truth, và có audit trail đủ tin cậy.

Điểm căng chính:

- Manager là entry point nhưng không thể bị bắt hiểu scanner, GitHub Actions hoặc source code.
- Developer hiểu technical evidence nhưng không có thẩm quyền xác nhận ý nghĩa pháp lý/nghiệp vụ.
- Scanner chỉ tạo evidence, không được tự kết luận pháp lý.
- Risk classification chỉ đáng tin khi dựa trên VerifiedProfile, không phải self-report đơn thuần.

## What Is Clear

### Role model

LCSP MVP chỉ nên expose 2 role:

- **Manager:** owns business/legal truth và final assessment.
- **Developer:** owns technical truth và technical evidence.

Các vai trò Legal, Compliance Owner, Product Owner, Tech Lead, DevOps, Security Engineer chỉ là responsibility bên trong Manager hoặc Developer trong MVP.

### Workflow model

MVP nên dùng **Manager-led workflow with Developer tasks**:

```text
Manager owns the assessment.
Developer only receives technical tasks assigned by Manager.
LCSP tracks progress and merges evidence when ready.
```

### Classification gating

LCSP không chạy Risk Classification Agent nếu chưa có technical evidence và VerifiedProfile.

Wizard-only không được hiển thị:

- Draft HIGH/MEDIUM/LOW
- Preliminary risk level
- Risk Level: HIGH/MEDIUM/LOW

Wizard-only chỉ được hiển thị:

- Preliminary Risk Indicators
- Technical Evidence Readiness
- Missing Evidence Checklist
- Potential risk factors
- Likely areas to verify

### Evidence collection direction

Recommended MVP direction:

```text
Hybrid strategy with GitHub App read-only as default MVP evidence path,
and Local/CI scanner as enterprise-safe alternative.
```

Implementation staging candidate:

```text
P0: GitHub App read-only scan
P1: Manual evidence upload / CLI scanner
P2: Full CI integration / GitHub Action
```

### Reconciliation authority

LCSP should use **dual-confirmation for material conflicts**:

- Developer confirms code/evidence/production truth.
- Manager confirms business/legal meaning.
- LCSP coordinates, explains, gates and logs. It does not become the final human authority.

### Score authority

Only Conflict Score can block workflow.

- Evidence Confidence Score: supporting signal.
- AI Intervention Score: supporting signal for classification.
- Conflict Score: control score that can block final classification/report.

Final report is blocked only when an unresolved material/critical conflict can affect risk classification or legal obligations.

### Evidence gates

Technical evidence must pass two gates:

1. **Schema completeness gate** to accept the report.
2. **Quality threshold gate** to unlock classification.

If scanner evidence is insufficient, LCSP can accept structured human technical attestation as an additional evidence source, but only with role, schema, provenance, structured claims and audit trail.

## Main Conflicts Resolved

- **Wizard-only classification:** rejected. Wizard-only produces readiness and indicators, not risk level.
- **Single final confirmer:** rejected. Technical and business/legal truth require separate confirmation.
- **Scanner as legal decision-maker:** rejected. Scanner only creates evidence.
- **GitHub App-only long-term strategy:** rejected. Good default for MVP, insufficient for enterprise trust.
- **Free-text attestation:** rejected. Attestation must be structured evidence.
- **Many user-facing roles:** rejected for MVP. Use Manager and Developer only.

## Remaining High-risk Assumptions

1. **Wizard simplicity vs completeness:** Can LCSP ask enough business/legal truth without making Manager answer technical questions?
2. **Legal corpus/rule reliability:** Are legal corpus and compliance rules sufficiently versioned, cited, traceable and mapped to risk criteria?
3. **Human attestation abuse risk:** Can LCSP prevent structured attestation from becoming a disguised "skip scanner" button?

## Session Conclusion

LCSP is ready to move toward Product Brief only if the high-risk assumptions above are carried forward as explicit open questions and validation tasks. The Product Brief should preserve the evidence-based positioning and avoid implying that Wizard-only self-report can produce a real risk classification.
