import { useI18n } from "@/locales/client";
import { cn } from "@bubba/ui/cn";

export const STATUS_TYPES = ["open", "pending", "closed"] as const;

export type StatusType = Exclude<
  (typeof STATUS_TYPES)[number],
  "draft" | "published"
>;

const STATUS_COLORS: Record<StatusType, string> = {
  open: "#ffc107",
  pending: "#0ea5e9",
  closed: "#22c55e",
} as const;

export function Status({ status }: { status: StatusType }) {
  const t = useI18n();

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("size-2.5")}
        style={{ backgroundColor: STATUS_COLORS[status] ?? "  " }}
      />
      {t(`common.status.${status}`)}
    </div>
  );
}
