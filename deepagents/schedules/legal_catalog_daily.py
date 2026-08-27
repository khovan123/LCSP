"""Managed schedule for proactive legal-intelligence maintenance and triage."""

from managed_deepagents import define_schedule


schedule = define_schedule(
    cron="0 2 * * *",
    timezone="Asia/Ho_Chi_Minh",
    prompt=(
        "Run LCSP in LEGAL_MAINTENANCE mode. Delegate the full legal-preparation cycle "
        "to the `triage` subagent. This is the SCHEDULED trigger. First call "
        "`maintain_legal_catalog` with `max_runs=0` so corpus/catalog maintenance cannot "
        "resume any Assessment before EngineeringRules are READY. Refresh only approved "
        "legal source manifests, detect source changes, preserve exact partial-update scope, "
        "and rebuild/activate the legal corpus only when content changed. Then load pending "
        "Legal Rule Triage work items for approved LegalRules. For each ready pending item, "
        "read the exact authoritative legal chunks, apply the legal-rule-triage skill, decide "
        "exactly one verdict per chunk (ENGINEERING_RULE_CANDIDATE, CONTEXT_ONLY, or REJECT), "
        "and for Candidate chunks prepare reusable EngineeringRule proposals before persisting "
        "the result through the deterministic triage boundary. Skip items already completed "
        "for the same governed source fingerprint; changed legal content or rule identity must "
        "be triaged again. Do not automatically retry or resume a customer Assessment from "
        "this schedule. Assessments waiting on ENGINEERING_RULE_NOT_READY are retried only "
        "through an explicit MANUAL legal-maintenance trigger after the required rules are READY. "
        "Do not start Context Wizard, Planner, Investigator, Resolver, or any customer assessment "
        "flow. Do not use customer assessment context, repository findings, or targeted repository "
        "reanalysis to make Legal Rule Triage decisions."
    ),
)
