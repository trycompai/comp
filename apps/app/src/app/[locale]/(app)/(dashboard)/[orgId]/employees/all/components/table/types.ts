export interface EmployeesTableProps {
	columnHeaders: {
		name: string;
		email: string;
		department: string;
		status: string;
	};
	users: Array<{
		id: string;
		name: string | null;
		full_name: string | null;
		email: string | null;
		role: string;
		emailVerified: Date | null;
		image: string | null;
		lastLogin: Date | null;
		organizationId: string | null;
	}>;
}

export interface FilterCategory {
	label: string;
	items: {
		label: string;
		value: string;
		checked: boolean;
		onChange: (checked: boolean) => void;
		icon?: React.ReactNode;
	}[];
	maxHeight?: string;
}
