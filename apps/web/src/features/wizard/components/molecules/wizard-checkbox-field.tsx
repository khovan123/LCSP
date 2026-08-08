"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardCheckboxFieldProps = Omit<
  React.ComponentProps<typeof Checkbox>,
  "name" | "onBlur"
> & {
  name: Extract<
    {
      [K in keyof WizardAnswers]: NonNullable<WizardAnswers[K]> extends unknown[] ? K : never;
    }[keyof WizardAnswers],
    string
  >;
  labelKey: string;
  descriptionKey: string;
  disabled?: boolean;
  options: readonly string[];
  onBlur?: () => void;
  onValueChange?: (name: keyof WizardAnswers) => void;
};

export function WizardCheckboxField({
  name,
  labelKey,
  descriptionKey,
  disabled,
  options,
  onBlur,
  onValueChange,
}: WizardCheckboxFieldProps) {
  const { control } = useFormContext<WizardAnswers>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedValues = Array.isArray(field.value) ? field.value : [];
        const errorKey =
          typeof fieldState.error?.message === "string"
            ? fieldState.error.message
            : undefined;
        const neutralOptionLabels = [
          t("pages.wizard.options.no"),
          t("pages.wizard.options.unknown"),
        ];

        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                {t(labelKey)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(descriptionKey)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((optionKey) => {
                const optionLabel = t(optionKey);
                const checked = selectedValues.includes(optionLabel);

                return (
                  <label
                    key={optionKey}
                    className={`flex items-start gap-3 rounded-lg border bg-muted/35 px-3 py-3 text-sm transition-colors ${
                      disabled
                        ? "cursor-not-allowed opacity-75"
                        : "cursor-pointer hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      disabled={disabled}
                      checked={checked}
                      onCheckedChange={() => {
                        if (disabled) {
                          return;
                        }

                        let nextValues: string[];
                        if (checked) {
                          nextValues = selectedValues.filter(
                            (value) => value !== optionLabel,
                          );
                        } else if (neutralOptionLabels.includes(optionLabel)) {
                          nextValues = [optionLabel];
                        } else {
                          nextValues = [
                            ...selectedValues.filter(
                              (value) => !neutralOptionLabels.includes(value),
                            ),
                            optionLabel,
                          ];
                        }

                        field.onChange(nextValues);
                        onValueChange?.(name);
                        onBlur?.();
                      }}
                      onBlur={() => {
                        field.onBlur();
                        onBlur?.();
                      }}
                      className="mt-0.5"
                    />
                    <span className="select-none leading-tight">
                      {optionLabel}
                    </span>
                  </label>
                );
              })}
            </div>
            {errorKey ? (
              <p className="text-sm text-destructive">{t(errorKey)}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
