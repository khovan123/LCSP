export type DocumentRequestActionCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionVariant?: "default" | "secondary" | "outline";
  disabled: boolean;
  highlighted?: boolean;
  onAction: () => void;
};
