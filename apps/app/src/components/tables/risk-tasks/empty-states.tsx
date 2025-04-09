"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import { Icons } from "@comp/ui/icons";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";

type Props = {
	hasFilters?: boolean;
};

export function NoResults({ hasFilters }: Props) {
	const t = useI18n();
	const router = useRouter();
	const { orgId, riskId } = useParams<{ orgId: string; riskId: string }>();

	return (
		<div className="flex items-center justify-center">
			<div className="flex flex-col items-center">
				<Icons.Transactions2 className="mb-4" />
				<div className="text-center mb-6 space-y-2">
					<h2 className="font-medium text-lg">
						{t("common.empty_states.no_results.title")}
					</h2>
					<p className="text-muted-foreground text-sm">
						{hasFilters
							? t("common.empty_states.no_results.description_filters")
							: t("common.empty_states.no_results.description_no_tasks")}
					</p>
				</div>

				{hasFilters && (
					<Button
						variant="outline"
						onClick={() => router.push(`/${orgId}/risks/${riskId}`)}
					>
						{t("common.filters.clear")}
					</Button>
				)}
			</div>
		</div>
	);
}

export function NoTasks({ isEmpty }: { isEmpty: boolean }) {
	const t = useI18n();

	const [open, setOpen] = useQueryState("create-task-sheet");

	return (
		<div className="absolute w-full top-0 left-0 flex items-center justify-center z-20">
			<div className="text-center max-w-sm mx-auto flex flex-col items-center justify-center">
				<h2 className="text-xl font-medium mb-2">
					{t("common.empty_states.no_results.title_tasks")}
				</h2>
				<p className="text-sm text-muted-foreground mb-6">
					{t("common.empty_states.no_results.description_no_tasks")}
				</p>
				<Button onClick={() => setOpen("true")}>
					<Plus className="h-4 w-4 mr-2" />
					{t("common.actions.create")}
				</Button>
			</div>
		</div>
	);
}
