"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Textarea } from "@/components/ui/textarea";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardTextareaFieldProps = {
  name: keyof WizardAnswers;
  labelKey: string;
  descriptionKey: string;
  placeholderKey: string;
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange?: (name: keyof WizardAnswers) => void;
};

export function WizardTextareaField({
  name,
  labelKey,
  descriptionKey,
  placeholderKey,
  disabled,
  onBlur,
  onValueChange,
}: WizardTextareaFieldProps) {
  const { control } = useFormContext<WizardAnswers>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const errorKey =
          typeof fieldState.error?.message === "string"
            ? fieldState.error.message
            : undefined;

        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t(labelKey)}
            </label>
            <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
            <Textarea
              disabled={disabled}
              className="min-h-32 resize-y bg-background"
              value={typeof field.value === "string" ? field.value : ""}
              placeholder={t(placeholderKey)}
              onChange={(event) => {
                field.onChange(event.target.value);
                onValueChange?.(name);
              }}
              onBlur={() => {
                field.onBlur();
                onBlur?.();
              }}
            />
            {errorKey ? (
              <p className="text-sm text-destructive">{t(errorKey)}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
