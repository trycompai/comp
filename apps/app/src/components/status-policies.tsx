import { useI18n } from "@/locales/client";
import { cn } from "@bubba/ui/cn";

export const STATUS_TYPES = [
  "draft",
  "published",
  "archived",
  "needs_review",
] as const;

export type StatusType = (typeof STATUS_TYPES)[number];

const STATUS_COLORS: Record<StatusType, string> = {
  draft: "#ffc107",
  published: "#00DC73",
  archived: "#0ea5e9",
  needs_review: "#ff0000",
} as const;

export function StatusPolicies({
  status,
  className,
}: {
  status: StatusType;
  className?: string;
}) {
  const t = useI18n();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("size-2.5")}
        style={{ backgroundColor: STATUS_COLORS[status] ?? "  " }}
      />
      {t(`policies.status.${status}`)}
    </div>
  );
}
