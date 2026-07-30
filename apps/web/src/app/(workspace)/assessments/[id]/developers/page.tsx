"use client";

import { resolveMessage } from "@lcsp/i18n";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appLocale } from "@/lib/locale";
import {
  useDevelopersQuery,
  useInviteDeveloperMutation,
  useRevokeMembershipMutation,
} from "@/lib/api/developer-queries";

export default function DevelopersPage() {
  const { id: assessmentId } = useParams<{ id: string }>();
  const [email, setEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const developersQuery = useDevelopersQuery();
  const inviteMutation = useInviteDeveloperMutation();
  const revokeMutation = useRevokeMembershipMutation();

  const t = (key: string) =>
    resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);

  const members = developersQuery.data ?? [];
  const isLoading = developersQuery.isLoading;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setFeedbackMessage(null);
    const result = await inviteMutation.mutateAsync(email);

    if (result.ok) {
      setEmail("");
      setFeedbackMessage(
        t("pages.developerManagement.inviteSuccess") ||
          "Đã gửi lời mời thành công.",
      );
    } else {
      setFeedbackMessage(
        t("pages.developerManagement.inviteError") || "Không thể gửi lời mời.",
      );
    }
  }

  async function handleRevoke(userId: string) {
    await revokeMutation.mutateAsync(userId);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-6">
      <header>
        <h1 className="text-3xl font-semibold">
          {t("pages.developerManagement.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.developerManagement.pageDescription")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("pages.developerManagement.inviteTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3" onSubmit={(e) => void handleInvite(e)}>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("pages.developerManagement.emailLabel")}
              required
            />
            <Button disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {t("pages.developerManagement.invite")}
            </Button>
          </form>
          {feedbackMessage ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {feedbackMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pages.developerManagement.membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin mr-2" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : members.length ? (
            members.map((member) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={member.user_id}
              >
                <div>
                  <p className="font-medium">
                    {member.display_name
                      ? `${member.display_name} (${member.email})`
                      : member.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("pages.developerManagement.scopeLabel")}: {assessmentId}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={revokeMutation.isPending}
                  onClick={() => void handleRevoke(member.user_id)}
                >
                  {revokeMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin mr-1" />
                  ) : null}
                  {t("pages.developerManagement.revoke")}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("pages.developerManagement.empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
