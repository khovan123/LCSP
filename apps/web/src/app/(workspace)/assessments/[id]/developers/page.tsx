"use client";
import { resolveMessage } from "@lcsp/i18n";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appLocale } from "@/lib/locale";
export default function DevelopersPage() {
  const { id } = useParams<{ id: string }>();
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<string[]>([
    "minh.nguyen@example.com",
    "linh.tran@example.com",
  ]);
  const t = (key: string) =>
    resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
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
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (email) {
                setMembers([...members, email]);
                setEmail("");
              }
            }}
          >
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("pages.developerManagement.emailLabel")}
              required
            />
            <Button>{t("pages.developerManagement.invite")}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("pages.developerManagement.membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length ? (
            members.map((member) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={member}
              >
                <div>
                  <p className="font-medium">{member}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("pages.developerManagement.scopeLabel")}: {id}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setMembers(members.filter((x) => x !== member))
                  }
                >
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
