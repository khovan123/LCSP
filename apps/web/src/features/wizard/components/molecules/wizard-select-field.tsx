"use client";

import { Controller, useFormContext } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardSelectFieldProps = {
  name: keyof WizardAnswers;
  labelKey: string;
  descriptionKey: string;
  extraDescriptionKey?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange?: (name: keyof WizardAnswers) => void;
  fromInputValue?: (value: string) => WizardAnswers[keyof WizardAnswers];
  toInputValue?: (value: WizardAnswers[keyof WizardAnswers]) => string;
  options: ReadonlyArray<{ value: string; labelKey: string }>;
};

export function WizardSelectField({
  name,
  labelKey,
  descriptionKey,
  extraDescriptionKey,
  disabled,
  onBlur,
  onValueChange,
  fromInputValue,
  toInputValue,
  options,
}: WizardSelectFieldProps) {
  const { control } = useFormContext<WizardAnswers>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const normalizedValue = toInputValue
          ? toInputValue(field.value)
          : typeof field.value === "string"
            ? field.value
            : "";
        const selectedOption = options.find(
          (option) => option.value === normalizedValue,
        );
        const displayLabel = selectedOption ? t(selectedOption.labelKey) : "";
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
            {extraDescriptionKey ? (
              <p className="text-sm text-muted-foreground">
                {t(extraDescriptionKey)}
              </p>
            ) : null}
            <Select
              disabled={disabled}
              value={normalizedValue}
              onValueChange={(nextValue) => {
                if (disabled) {
                  return;
                }

                field.onChange(
                  fromInputValue
                    ? fromInputValue(nextValue ?? "")
                    : (nextValue ?? ""),
                );
                onValueChange?.(name);
                onBlur?.();
              }}
              onOpenChange={(open) => {
                if (!open) {
                  field.onBlur();
                  onBlur?.();
                }
              }}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue>{displayLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorKey ? (
              <p className="text-sm text-destructive">{t(errorKey)}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
