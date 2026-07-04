# LCSP Jira Estimate Plan

Per-issue estimate plan for Jira `Start date`, `Due date`, `Story point estimate`, and `Priority`.

## Rules

- Epics remain in `Backlog` and keep project-level estimate dates; they are not assigned to execution sprints.
- Story and Task dates are staggered inside each sprint window.
- Main-flow P0 tasks use `Highest` priority and 3 task points.
- Non-main P0 tasks use `High` priority and 2-3 task points depending on runtime complexity.
- P1 tasks use `Medium` priority and 1-2 task points.
- Story points are Fibonacci-capped from their child task estimates.
- DONE tasks keep 1 point and `Low` priority for historical tracking.

## Summary

| Sprint | Issues | Epics | Stories | Tasks | Points | Highest | High | Medium | Low |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| LCSP Sprint 1 | 52 | 0 | 12 | 40 | 175 | 17 | 24 | 4 | 7 |
| LCSP Sprint 2 | 32 | 0 | 6 | 26 | 102 | 13 | 17 | 2 | 0 |
| LCSP Sprint 3 | 16 | 0 | 6 | 10 | 46 | 4 | 12 | 0 | 0 |
| LCSP Sprint 4 | 12 | 0 | 5 | 7 | 29 | 5 | 5 | 2 | 0 |
| LCSP Sprint 5 | 11 | 0 | 4 | 7 | 14 | 0 | 0 | 11 | 0 |
| Backlog | 24 | 24 | 0 | 0 | 237 | 13 | 9 | 2 | 0 |

## Artifacts

- `docs/developer/jira-lcsp-estimate-plan.csv`
- `docs/developer/jira-lcsp-estimate-plan-summary.csv`

