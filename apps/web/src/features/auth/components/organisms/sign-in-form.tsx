"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { LabeledSeparator } from "@/components/molecules/labeled-separator";
import { FormCard } from "@/components/organisms/form-card";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/api/auth-client";
import githubIcon from "@/public/assets/icons/github.svg";
import googleIcon from "@/public/assets/icons/google.svg";

import { signInFields } from "../../config/sign-in-fields";
import { appLocale } from "@/lib/locale";
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
    if (outcome.kind === "workspace_selection_required") { router.replace("/workspace/select"); return; }
    if (outcome.kind === "mfa_required") {
      router.replace("/mfa/verify");
      return;
    }
    form.setError("root", { message: outcome.detailKey });
  }

  return (
    <FormProvider {...form}>
      <FormCard
        title={resolveMessage(appLocale, "pages.signIn.formTitle")}
        description={resolveMessage(appLocale, "pages.signIn.formDescription")}
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
                ? resolveMessage(appLocale, "pages.signIn.submitting")
                : resolveMessage(appLocale, "pages.signIn.submit")}
            </Button>
            <LabeledSeparator
              label={resolveMessage(appLocale, "pages.signIn.divider")}
            />
            <div className="grid grid-cols-2 gap-2">
              <OAuthButton provider="google" icon={<GoogleIcon />}>
                {resolveMessage(appLocale, "pages.signIn.oauthGoogle")}
              </OAuthButton>
              <OAuthButton provider="github" icon={<GitHubIcon />}>
                {resolveMessage(appLocale, "pages.signIn.oauthGitHub")}
              </OAuthButton>
            </div>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {resolveMessage(appLocale, "pages.signIn.accessHelp")}
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
                    appLocale,
                    "pages.signIn.errors.requestFailedTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, rootError)}
                </AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}

function OAuthButton({
  provider,
  icon,
  children,
}: {
  provider: "google" | "github";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button
      className="w-full"
      variant="outline"
      nativeButton={false}
      render={<a href={`/api/auth/oauth/start?provider=${provider}`} />}
    >
      {icon}
      {children}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <Image src={googleIcon} alt="" className="size-4" aria-hidden="true" />
  );
}

function GitHubIcon() {
  return (
    <Image
      src={githubIcon}
      alt=""
      className="size-4 dark:invert"
      aria-hidden="true"
    />
  );
}
