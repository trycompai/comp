"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { Departments } from "@comp/db/types";
import { Building } from "lucide-react";

interface DepartmentSectionProps {
	onDepartmentChange: (value: Departments) => void;
	department: Departments;
	disabled?: boolean;
}

export function EvidenceDepartmentSection({
	onDepartmentChange,
	department,
	disabled = false,
}: DepartmentSectionProps) {
	const handleDepartmentChange = (value: Departments) => {
		onDepartmentChange(value);
	};

	// Filter out 'none' from the displayed options as we handle it separately
	const departmentOptions = Object.values(Departments).filter(
		(dept) => dept !== "none",
	);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2 mb-1.5">
				<span className="font-medium">Department</span>
			</div>
			<Select
				value={department || "none"}
				onValueChange={handleDepartmentChange}
				disabled={disabled}
			>
				<SelectTrigger className="w-full h-9 text-sm">
					<SelectValue placeholder="Select department" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">None</SelectItem>
					{departmentOptions.map((dept) => (
						<SelectItem key={dept} value={dept}>
							{dept.replace(/_/g, " ").toUpperCase()}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
