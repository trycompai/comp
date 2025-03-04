"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@bubba/ui/card";
import { Skeleton } from "@bubba/ui/skeleton";
import { useI18n } from "@/locales/client";
import { useParams } from "next/navigation";
import { useOrganizationEvidence } from "../../hooks/useOrganizationEvidence";
import { FileSection } from "../../components/FileSection";
import { UrlSection } from "../../components/UrlSection";

export function EditEvidenceForm() {
	const { id } = useParams<{ id: string }>();
	const { data, isLoading, error, mutate } = useOrganizationEvidence({ id });
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

	const evidence = data.data;

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<div className="flex items-center justify-between gap-2">
						{t("evidence.details.content")}
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<FileSection
					evidenceId={id}
					fileUrls={evidence.fileUrls}
					onSuccess={handleMutate}
				/>

				<UrlSection
					evidenceId={id}
					additionalUrls={evidence.additionalUrls}
					onSuccess={handleMutate}
				/>
			</CardContent>
		</Card>
	);
}
