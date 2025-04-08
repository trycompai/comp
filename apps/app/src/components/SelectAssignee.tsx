import { Avatar, AvatarImage, AvatarFallback } from "@comp/ui/avatar";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
} from "@comp/ui/select";
import { UserIcon } from "lucide-react";
import { Member, User } from "@comp/db/types";
import { useState, useEffect } from "react";
import { db } from "@comp/db";

interface SelectAssigneeProps {
	assigneeId: string | null;
	disabled?: boolean;
	assignees: (Member & { user: User })[];
	onAssigneeChange: (value: string | null) => void;
	withTitle?: boolean;
}

export const SelectAssignee = ({
	assigneeId,
	disabled,
	assignees,
	onAssigneeChange,
	withTitle = true,
}: SelectAssigneeProps) => {
	const [selectedAssignee, setSelectedAssignee] = useState<
		(Member & { user: User }) | null
	>(null);

	// Initialize selectedAssignee based on assigneeId prop
	useEffect(() => {
		if (assigneeId && assignees) {
			const assignee = assignees.find((a) => a.id === assigneeId);
			if (assignee) {
				setSelectedAssignee(assignee);
			}
		} else {
			setSelectedAssignee(null);
		}
	}, [assigneeId, assignees]);

	const handleAssigneeChange = (value: string) => {
		const newAssigneeId = value === "none" ? null : value;
		onAssigneeChange(newAssigneeId);

		if (newAssigneeId && assignees) {
			const assignee = assignees.find((a) => a.id === newAssigneeId);
			if (assignee) {
				setSelectedAssignee(assignee);
			} else {
				setSelectedAssignee(null);
			}
		} else {
			setSelectedAssignee(null);
		}
	};

	// Function to safely prepare image URLs
	const getImageUrl = (image: string | null) => {
		if (!image) return "";

		// If image is a relative URL, ensure it's properly formed
		if (image.startsWith("/")) {
			return image;
		}

		return image;
	};

	// Render the none fallback avatar
	const renderNoneAvatar = () => (
		<div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted">
			<UserIcon className="h-3 w-3" />
		</div>
	);

	return (
		<div className="flex flex-col gap-2">
			{withTitle && (
				<div className="flex items-center gap-2 mb-1.5">
					<span className="font-medium">Assignee</span>
				</div>
			)}
			<Select
				value={assigneeId || "none"}
				onValueChange={handleAssigneeChange}
				disabled={disabled}
			>
				<SelectTrigger className="w-full">
					{selectedAssignee ? (
						<div className="flex items-center gap-2">
							<Avatar className="h-5 w-5 shrink-0">
								<AvatarImage
									src={getImageUrl(selectedAssignee.user.image)}
									alt={selectedAssignee.user.name || "User"}
								/>
								<AvatarFallback>
									{selectedAssignee.user.name?.charAt(0) || "?"}
								</AvatarFallback>
							</Avatar>
							<span className="truncate">
								{selectedAssignee.user.name || "Unknown User"}
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							{renderNoneAvatar()}
							<span>None</span>
						</div>
					)}
				</SelectTrigger>
				<SelectContent
					className="min-w-[var(--radix-select-trigger-width)] w-auto max-w-[250px] z-50"
					position="popper"
					sideOffset={5}
					align="start"
				>
					<SelectItem value="none" className="w-full p-0 overflow-hidden">
						<div className="flex items-center gap-2 py-1.5 px-3 w-full">
							{renderNoneAvatar()}
							<span>None</span>
						</div>
					</SelectItem>
					{assignees.map((assignee) => (
						<SelectItem
							key={assignee.id}
							value={assignee.id}
							className="w-full p-0 overflow-hidden"
						>
							<div className="flex items-center gap-2 py-1.5 px-3 w-full">
								<Avatar className="h-5 w-5 shrink-0">
									<AvatarImage
										src={getImageUrl(assignee.user.image)}
										alt={assignee.user.name || "User"}
									/>
									<AvatarFallback>
										{assignee.user.name?.charAt(0) || "?"}
									</AvatarFallback>
								</Avatar>
								<span className="truncate">
									{assignee.user.name || "Unknown User"}
								</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
