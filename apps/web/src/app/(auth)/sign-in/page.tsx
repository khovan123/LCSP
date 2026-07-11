import type { Metadata } from "next";

import { SignInPage as AuthSignInPage } from "@/features/auth/components/organisms/sign-in-page";

export const metadata: Metadata = {
  title: "Sign in | LCSP",
  description: "Access the LCSP compliance workspace.",
};

export default function SignInPage() {
  return <AuthSignInPage />;
}
