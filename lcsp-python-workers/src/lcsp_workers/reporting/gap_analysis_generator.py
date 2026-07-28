class GapAnalysisGenerator:
    @staticmethod
    def generate(
        assessment_name: str,
        assessment_context: str,
        technical_evidence: list,
        ai_usage_claims: list,
        applicable_rules: list,
        missing_evidence: list,
        recommendations: list
    ) -> str:
        """
        Generates a GapAnalysis Markdown document from structured data.
        Does NOT use an LLM. Pure string templating.
        """
        # Section 1: Context
        content = [
            f"# Title: Gap Analysis — {assessment_name}",
            "**Label: Wizard Readiness and Legal Gap Analysis**\n",
            "## 1. Assessment Context",
            f"{assessment_context}\n",
            "## 2. Technical Evidence Summary"
        ]
        
        # Section 2: Technical
        if not technical_evidence:
            content.append("No technical evidence provided.")
        else:
            for ev in technical_evidence:
                content.append(f"- {ev}")
        content.append("")
                
        # Section 3: AI Usage Patterns
        content.append("## 3. Identified AI Usage Patterns")
        if not ai_usage_claims:
            content.append("No AI usage claims identified.")
        else:
            for claim in ai_usage_claims:
                content.append(f"- {claim}")
        content.append("")
                
        # Section 4: Legal Rules
        content.append("## 4. Legal Rule Applicability")
        if not applicable_rules:
            content.append("No applicable legal rules.")
        else:
            for rule in applicable_rules:
                content.append(f"- {rule}")
        content.append("")
                
        # Section 5: Missing Evidence
        content.append("## 5. Missing Evidence / Coverage Gaps")
        if not missing_evidence:
            content.append("No coverage gaps identified.")
        else:
            for gap in missing_evidence:
                content.append(f"- {gap}")
        content.append("")
                
        # Section 6: Next Steps
        content.append("## 6. Recommended Next Steps")
        if not recommendations:
            content.append("No recommendations.")
        else:
            for rec in recommendations:
                content.append(f"- {rec}")
                
        return "\n".join(content)
