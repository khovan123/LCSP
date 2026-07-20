import {
  DEVELOPER_ALLOWED_ACTIONS,
  PBAC_ACTIONS,
  isDeveloperAllowedAction,
} from "@lcsp/contracts/pbac";
import type { MessageKey } from "@lcsp/i18n";

const actionLabelKeys: Record<string, MessageKey> = {
  [PBAC_ACTIONS.assessmentList]:
    "pages.developerTask.actions.assessmentList",
  [PBAC_ACTIONS.evidenceReadRedacted]:
    "pages.developerTask.actions.evidenceReadRedacted",
  "ai-usage-flow:read": "pages.developerTask.actions.aiUsageFlowRead",
  "findings:read:redacted":
    "pages.developerTask.actions.findingsReadRedacted",
  "conflict:comment": "pages.developerTask.actions.conflictComment",
  [PBAC_ACTIONS.scanRead]: "pages.developerTask.actions.scanRead",
};

export function getVisibleDeveloperActions(
  grantedActions: readonly string[],
): Array<{ action: string; labelKey: MessageKey }> {
  return grantedActions
    .filter(
      (action) =>
        DEVELOPER_ALLOWED_ACTIONS.includes(action) &&
        isDeveloperAllowedAction(action) &&
        action in actionLabelKeys,
    )
    .map((action) => ({ action, labelKey: actionLabelKeys[action] }));
}
