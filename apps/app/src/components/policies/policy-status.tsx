import { useI18n } from "@/locales/client";
import { cn } from "@bubba/ui/cn";

export const STATUS_TYPES = ["draft", "published"] as const;

export type StatusType = (typeof STATUS_TYPES)[number];

const STATUS_COLORS: Record<StatusType, string> = {
  draft: "#ffc107",
  published: "#22c55e",
} as const;

export function PolicyStatus({ status }: { status: StatusType }) {
  const t = useI18n();

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("size-2.5")}
        style={{ backgroundColor: STATUS_COLORS[status] ?? "#ffc107" }}
      />
      {t(`policies.table.statuses.${status}`)}
    </div>
  );
}
