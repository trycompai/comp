"use client";

import { calculateNextReview } from "@/lib/utils/calculate-next-review";
import type {
	Departments,
	Evidence,
	EvidenceStatus,
	Frequency,
	Member,
	User,
	User as UserType,
} from "@comp/db/types";
import { Button } from "@comp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@comp/ui/card";
import { Save } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { updateEvidenceDetails } from "../actions/updateEvidenceDetails";
import { EvidenceDepartmentSection } from "./EvidenceDepartmentSection";
import { EvidenceFrequencySection } from "./EvidenceFrequencySection";
import { EvidenceNextReviewSection } from "./EvidenceNextReviewSection";
import { EvidenceStatusSection } from "./EvidenceStatusSection";
import { SelectAssignee } from "@/components/SelectAssignee";

interface ReviewSectionProps {
	evidence: Evidence & {
		assignee?:
			| (Member & {
					user: User;
			  })
			| null;
	};
	lastPublishedAt: Date | null;
	frequency: Frequency | null;
	department: Departments;
	currentAssigneeId: string | null | undefined;
	assignees: (Member & {
		user: UserType;
	})[];
}

export function ReviewSection({
	lastPublishedAt,
	frequency: initialFrequency,
	department: initialDepartment,
	currentAssigneeId,
	evidence,
	assignees,
}: ReviewSectionProps) {
	const reviewInfo = calculateNextReview(lastPublishedAt, initialFrequency);

	// State for tracking form values
	const [frequency, setFrequency] = useState<Frequency | null>(
		initialFrequency,
	);
	const [department, setDepartment] = useState<Departments>(initialDepartment);
	const [assigneeId, setAssigneeId] = useState<string | null>(
		currentAssigneeId || null,
	);
	const [status, setStatus] = useState<EvidenceStatus>(
		evidence.status || "draft",
	);
	const [isSaving, setIsSaving] = useState(false);

	const { execute: updateDetailsAction } = useAction(updateEvidenceDetails, {
		onSuccess: async () => {
			toast.success("Evidence details updated successfully");
			setIsSaving(false);
		},
		onError: () => {
			toast.error("Failed to update evidence details");
			setIsSaving(false);
		},
	});

	const handleSaveChanges = () => {
		setIsSaving(true);
		updateDetailsAction({
			id: evidence.id,
			frequency,
			department,
			assigneeId,
			status,
		});
	};

	const handleDepartmentChange = (value: Departments) => {
		setDepartment(value);
	};

	const handleStatusChange = (value: EvidenceStatus) => {
		setStatus(value);
	};

	return (
		<Card className="overflow-hidden">
			<CardHeader>
				<CardTitle className="text-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-lg font-medium">{evidence.name}</h2>
						<h3 className="text-sm text-muted-foreground">
							{evidence.description}
						</h3>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pt-2">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
					<SelectAssignee
						assignees={assignees}
						onAssigneeChange={setAssigneeId}
						assigneeId={assigneeId}
						disabled={isSaving}
					/>

					<EvidenceStatusSection
						status={status}
						handleStatusChange={handleStatusChange}
						isSaving={isSaving}
					/>

					<EvidenceDepartmentSection
						onDepartmentChange={handleDepartmentChange}
						department={department}
						disabled={isSaving}
					/>

					<EvidenceFrequencySection
						onFrequencyChange={setFrequency}
						frequency={frequency}
						disabled={isSaving}
					/>

					<EvidenceNextReviewSection reviewInfo={reviewInfo} />
				</div>

				<Button
					size="sm"
					onClick={handleSaveChanges}
					disabled={isSaving}
					className="self-end"
				>
					<Save className="h-4 w-4 mr-2" />
					Save
				</Button>
			</CardContent>
		</Card>
	);
}
