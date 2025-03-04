"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Skeleton } from "@bubba/ui/skeleton";
import { useI18n } from "@/locales/client";
import { useParams } from "next/navigation";
import { useTaskAttachments } from "@/app/[locale]/(app)/(dashboard)/risk/[riskId]/tasks/[taskId]/hooks/useTaskAttachments";
import { FileSection } from "@/components/upload/FileSection";
import { UPLOAD_TYPE } from "@/actions/types";

export function TaskAttachments({ taskId }: { taskId: string }) {
	const { data, isLoading, error, mutate } = useTaskAttachments({
		id: taskId,
	});
	const t = useI18n();

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-60 w-full" />
			</div>
		);
	}

	if (error) {
		return <div>Error</div>;
	}

	const handleMutate = async () => {
		await mutate();
	};

	if (!data?.data) return null;

	const attachments = data.data;

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex items-center justify-between gap-2">
						{t("risk.tasks.attachments")}
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<FileSection
					uploadType={UPLOAD_TYPE.riskTask}
					taskId={taskId}
					fileUrls={attachments.map((attachment) => attachment.fileUrl)}
					onSuccess={handleMutate}
				/>
			</CardContent>
		</Card>
	);
}
