"use client";

import { GitBranchIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  GITHUB_CONNECTION_STATUSES,
  type GitHubConnectionStatus,
} from "../../types/settings-page.types";

export type GitHubRepositoryConnectCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  successTitle: string;
  successDescription: string;
  failedTitle: string;
  failedDescription: string;
  status: GitHubConnectionStatus | null;
  onConnect: () => void;
};

export function GitHubRepositoryConnectCard({
  title,
  description,
  actionLabel,
  successTitle,
  successDescription,
  failedTitle,
  failedDescription,
  status,
  onConnect,
}: GitHubRepositoryConnectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status === GITHUB_CONNECTION_STATUSES.success ? (
          <Alert>
            <AlertTitle>{successTitle}</AlertTitle>
            <AlertDescription>{successDescription}</AlertDescription>
          </Alert>
        ) : null}
        {status === GITHUB_CONNECTION_STATUSES.failed ? (
          <Alert variant="destructive">
            <AlertTitle>{failedTitle}</AlertTitle>
            <AlertDescription>{failedDescription}</AlertDescription>
          </Alert>
        ) : null}
        <Separator />
        <Button type="button" className="self-start" onClick={onConnect}>
          <GitBranchIcon data-icon="inline-start" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
