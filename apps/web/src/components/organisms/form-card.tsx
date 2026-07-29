import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { FormCardProps } from "../types/form-card.types";

export function FormCard({
  eyebrow,
  title,
  description,
  leading,
  children,
  footer,
}: FormCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        {eyebrow ? (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.13em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {leading}
        {children}
      </CardContent>
      <CardFooter className="flex-col gap-2">{footer}</CardFooter>
    </Card>
  );
}
