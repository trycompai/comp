"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";

import { getEmployees } from "../actions/get-employees";

import { createEmployeeAction } from "@/actions/people/create-employee-action";
import type { Departments } from "@comp/db/types";
import type {
	AppError,
	Employee,
	EmployeesInput,
	EmployeesResponse,
} from "../types";
import type { EmployeeWithUser } from "../components/table/columns";

/** Fetcher function, same as before */
async function fetchEmployees(
	input: EmployeesInput,
): Promise<EmployeesResponse> {
	const result = await getEmployees(input);

	if (!result) {
		const error: AppError = {
			code: "UNEXPECTED_ERROR",
			message: "An unexpected error occurred",
		};
		throw error;
	}

	if (result.serverError) {
		const error: AppError = {
			code: "UNEXPECTED_ERROR",
			message: result.serverError || "An unexpected error occurred",
		};
		throw error;
	}

	// Transform the data to match the expected EmployeesResponse format
	const rawData = result.data?.data;

	if (!rawData) {
		return { employees: [], total: 0 };
	}

	const employees = rawData.employees;

	return {
		employees,
		total: rawData.total,
	};
}

export function useEmployees({
	search = "",
	role = "",
	page = 1,
	per_page = 10,
}: EmployeesInput) {
	const {
		data,
		error,
		isLoading,
		mutate: revalidateEmployees,
	} = useSWR<EmployeesResponse, AppError>(
		["employees", { search, role, page, per_page }],
		() => fetchEmployees({ search, role, page, per_page }),
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
		},
	);

	/** Track local mutation (creating an employee) loading state */
	const [isMutating, setIsMutating] = useState(false);

	/**
	 * Calls the server action to create an employee, then
	 * revalidates the employees list if successful.
	 */
	const addEmployee = useCallback(
		async (employeeData: {
			name: string;
			email: string;
			department?: string;
			externalEmployeeId?: string;
			isActive?: boolean;
		}) => {
			setIsMutating(true);
			try {
				const result = await createEmployeeAction({
					name: employeeData.name,
					email: employeeData.email,
					department: employeeData.department as Departments,
					externalEmployeeId: employeeData.externalEmployeeId,
					isActive: employeeData.isActive,
				});

				if (!result) {
					throw new Error("Failed to create employee");
				}

				if (result.serverError) {
					throw new Error(result.serverError || "Failed to create employee");
				}

				if (result.data?.error) {
					throw new Error(
						typeof result.data.error === "string"
							? result.data.error
							: "Failed to create employee",
					);
				}

				// If successful, revalidate the SWR data so the new employee appears.
				// (You could do an optimistic update here if desired.)
				await revalidateEmployees();
			} catch (err) {
				console.error("createEmployeeAction failed:", err);
				// Surface the error upward if you like:
				throw err;
			} finally {
				setIsMutating(false);
			}
		},
		[revalidateEmployees],
	);

	return {
		employees: (data?.employees as EmployeeWithUser[]) ?? [],
		total: data?.total,
		isLoading,
		isMutating,
		error,
		revalidateEmployees,
		addEmployee,
	};
}
