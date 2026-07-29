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
  children,
  footer,
}: FormCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.13em] text-primary">
          {eyebrow}
        </p>
        <CardTitle className="text-3xl tracking-tight sm:text-4xl">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex-col gap-5">{footer}</CardFooter>
    </Card>
  );
}
