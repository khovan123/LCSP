import { resolveMessage } from "@lcsp/i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appLocale } from "@/lib/locale";

import { getConflictTypeLabelKey } from "../../config/conflict-labels";
import type { ConflictCardModel } from "../../types/conflict.types";

type ConflictCardProps = {
  conflict: ConflictCardModel;
  resolution: "RESOLVED" | "DISMISSED";
  resolutionNote: string;
  isSubmitting: boolean;
  formError: string | null;
  onResolutionChange: (resolution: "RESOLVED" | "DISMISSED") => void;
  onResolutionNoteChange: (note: string) => void;
  onSubmit: () => void;
};

export function ConflictCard({
  conflict,
  resolution,
  resolutionNote,
  isSubmitting,
  formError,
  onResolutionChange,
  onResolutionNoteChange,
  onSubmit,
}: ConflictCardProps) {
  const scorePercent = Math.max(0, Math.min(100, Math.round(conflict.conflict_score * 100)));
  const scoreTone =
    scorePercent <= 40 ? "bg-green-500" : scorePercent <= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{resolveMessage(appLocale, getConflictTypeLabelKey(conflict.conflict_type))}</CardTitle>
          <Badge variant="outline">{resolveMessage(appLocale, "pages.reconciliation.pendingBadge")}</Badge>
        </div>
        <CardDescription>{conflict.score_explanation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              {resolveMessage(appLocale, "pages.reconciliation.scoreLabel")}
            </span>
            <span className="font-medium">{scorePercent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={resolveMessage(appLocale, "pages.reconciliation.scoreLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={scorePercent}
          >
            <div
              className={`h-full ${scoreTone}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            {resolveMessage(appLocale, "pages.reconciliation.evidenceRefsLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {conflict.evidence_refs.map((ref, index) => (
              <Badge key={`${ref}-${index}`} variant="secondary">
                {ref}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium" htmlFor={`resolution-${conflict.conflict_id}`}>
            {resolveMessage(appLocale, "pages.reconciliation.resolutionLabel")}
          </label>
          <select
            id={`resolution-${conflict.conflict_id}`}
            value={resolution}
            disabled={isSubmitting}
            onChange={(event) => onResolutionChange(event.target.value as "RESOLVED" | "DISMISSED")}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="RESOLVED">
              {resolveMessage(appLocale, "pages.reconciliation.resolutionResolved")}
            </option>
            <option value="DISMISSED">
              {resolveMessage(appLocale, "pages.reconciliation.resolutionDismissed")}
            </option>
          </select>

          <label className="text-sm font-medium" htmlFor={`note-${conflict.conflict_id}`}>
            {resolveMessage(appLocale, "pages.reconciliation.resolutionNoteLabel")}
          </label>
          <textarea
            id={`note-${conflict.conflict_id}`}
            value={resolutionNote}
            disabled={isSubmitting}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? `conflict-error-${conflict.conflict_id}` : undefined}
            maxLength={2000}
            placeholder={resolveMessage(appLocale, "pages.reconciliation.resolutionNotePlaceholder")}
            onChange={(event) => onResolutionNoteChange(event.target.value)}
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
          />

          {formError ? (
            <p
              id={`conflict-error-${conflict.conflict_id}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? resolveMessage(appLocale, "pages.reconciliation.submitting")
            : resolveMessage(appLocale, "pages.reconciliation.submitAction")}
        </Button>
      </CardFooter>
    </Card>
  );
}
