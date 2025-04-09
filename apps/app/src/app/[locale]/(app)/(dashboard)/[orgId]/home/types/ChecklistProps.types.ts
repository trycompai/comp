import { Onboarding } from "@comp/db/types";

export interface ChecklistProps {
	items: ChecklistItemProps[];
}

export interface ChecklistItemProps {
	title: string;
	description?: string;
	href: string;
	dbColumn: Exclude<keyof Onboarding, "organizationId">;
	completed: boolean;
}
