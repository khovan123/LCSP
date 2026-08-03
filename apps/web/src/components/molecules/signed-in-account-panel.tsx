import { resolveMessage } from "@lcsp/i18n";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { appLocale } from "@/lib/locale";
import type { SignedInAccountPanelProps } from "@/components/types/confirm-access-dialog.types";

export function SignedInAccountPanel({
  accountLabelKey,
  accountHandle,
  avatarImageSrc,
  avatarFallback,
}: SignedInAccountPanelProps) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-4 px-5 py-5">
        <Avatar size="lg">
          {avatarImageSrc ? <AvatarImage src={avatarImageSrc} alt="" /> : null}
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            {resolveMessage(appLocale, accountLabelKey)}
          </p>
          <p className="truncate text-2xl font-medium tracking-tight">
            {accountHandle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
