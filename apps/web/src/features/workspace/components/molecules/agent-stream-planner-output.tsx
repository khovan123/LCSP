import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";

import type { AgentStreamRuleHeader } from "../../types/agent-stream-rule.types";

export function AgentStreamPlannerOutput({
  rules,
}: {
  rules: AgentStreamRuleHeader[];
}) {
  return (
    <div
      data-stream-planner-output
      className="mt-3 min-w-0 text-sm text-foreground"
    >
      <p className="font-medium">
        {resolveMessage(
          appLocale,
          "pages.appShell.agentStreamRule.plannedGoals",
        )}
      </p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        {rules.map((rule) => (
          <li
            key={rule.ruleId}
            data-stream-planner-goal
            className="break-words"
          >
            {rule.goals.length > 0 ? (
              rule.goals.map((goal, index) => (
                <p key={`${rule.ruleId}:${index}`}>{goal}</p>
              ))
            ) : (
              // No investigationGoals yet — the concept is still a
              // meaningful, human summary; never fall back to the raw ruleId.
              <p>{rule.concept}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
