"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { LabeledSeparator } from "@/components/molecules/labeled-separator";
import { FormCard } from "@/components/organisms/form-card";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/api/auth-client";

import { signInFields } from "../../config/sign-in-fields";
import { authLocale } from "../../config/locale";
import { signInSchema } from "../../schemas/sign-in.schema";
import type { SignInFormValues } from "../../schemas/sign-in.schema";
import { CredentialField } from "../molecules/credential-field";

export function SignInForm() {
  const router = useRouter();
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const rootError = form.formState.errors.root?.message as
    | Parameters<typeof resolveMessage>[1]
    | undefined;

  async function onSubmit(values: SignInFormValues) {
    const outcome = await signIn(values).catch(() => ({
      kind: "error" as const,
      titleKey: "pages.signIn.errors.requestFailedTitle" as const,
      detailKey: "pages.signIn.errors.requestFailedDetail" as const,
    }));
    form.reset();

    if (outcome.kind === "authenticated") {
      router.replace("/workspace");
      return;
    }
    if (outcome.kind === "mfa_required") {
      router.replace("/auth/mfa/verify");
      return;
    }
    form.setError("root", { message: outcome.detailKey });
  }

  return (
    <FormProvider {...form}>
      <FormCard
        eyebrow={resolveMessage(authLocale, "pages.signIn.formEyebrow")}
        title={resolveMessage(authLocale, "pages.signIn.formTitle")}
        description={resolveMessage(authLocale, "pages.signIn.formDescription")}
        footer={
          <>
            <Button
              className="w-full"
              type="submit"
              form="sign-in-form"
              disabled={form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {form.formState.isSubmitting
                ? resolveMessage(authLocale, "pages.signIn.submitting")
                : resolveMessage(authLocale, "pages.signIn.submit")}
            </Button>
            <LabeledSeparator
              label={resolveMessage(authLocale, "pages.signIn.divider")}
            />
            <Button
              className="w-full"
              variant="outline"
              nativeButton={false}
              render={<a href="/api/auth/oauth/start?provider=github" />}
            >
              {resolveMessage(authLocale, "pages.signIn.oauthGitHub")}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {resolveMessage(authLocale, "pages.signIn.accessHelp")}
            </p>
          </>
        }
      >
        <form
          id="sign-in-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            {signInFields.map((field) => (
              <CredentialField key={field.name} field={field} />
            ))}
            {rootError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    authLocale,
                    "pages.signIn.errors.requestFailedTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(authLocale, rootError)}
                </AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}
