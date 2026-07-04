# Jira Import Operating Model

This document describes the current Jira import files generated from the active module task catalog. Legacy Jira configuration CSVs and coarse-grained TASK imports were removed.

## Source Of Truth

- Active task catalog: `docs/implementation/tasks/modules/README.md`
- Active task files: `docs/implementation/tasks/modules/**`
- Generated summary: `docs/implementation/tasks/README.md`

## Generated CSV Files

- `docs/developer/jira-lcsp-modules-import.csv` — one Jira Epic-style row per module.
- `docs/developer/jira-lcsp-stories-import.csv` — one Jira Story row per implementation story represented in module task frontmatter.
- `docs/developer/jira-lcsp-tasks-import.csv` — one Jira Task row per module-scoped implementation task.
- `docs/developer/jira-lcsp-story-task-mapping.csv` — traceability join between story and module task.

## Regeneration Rule

Regenerate these CSVs from `docs/implementation/tasks/modules/**` whenever module task frontmatter changes. Do not restore removed Jira administration/configuration CSVs or coarse legacy task imports unless Jira administration explicitly requires a separate configuration export.
