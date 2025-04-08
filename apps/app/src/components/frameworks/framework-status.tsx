import { useI18n } from "@/locales/client";
import { cn } from "@comp/ui/cn";

export const STATUS_TYPES = [
	"completed",
	"in_progress",
	"not_started",
] as const;

export type StatusType = Exclude<
	(typeof STATUS_TYPES)[number],
	"draft" | "published"
>;

const STATUS_COLORS: Record<StatusType, string> = {
	completed: "#22c55e",
	in_progress: "#eab308",
	not_started: "#f43f5e",
} as const;

export function DisplayFrameworkStatus({ status }: { status: StatusType }) {
	const t = useI18n();

	return (
		<div className="flex items-center gap-2">
			<div
				className={cn("size-2.5 rounded-none")}
				style={{ backgroundColor: STATUS_COLORS[status] ?? "  " }}
			/>
			{t(`frameworks.controls.statuses.${status}`)}
		</div>
	);
}
