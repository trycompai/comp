import type { Departments } from "@prisma/client";

/**
 * Department display names mapping
 */
export const DEPARTMENT_NAMES: Record<Departments, string> = {
	none: "Uncategorized",
	admin: "Administration",
	gov: "Governance",
	hr: "Human Resources",
	it: "Information Technology",
	itsm: "IT Service Management",
	qms: "Quality Management",
};
