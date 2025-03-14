"use client";

import {
	createContext,
	useContext,
	useMemo,
	useState,
	useRef,
	useEffect,
	type ReactNode,
} from "react";
import { useQueryState } from "nuqs";
import type { Frequency, Departments } from "@bubba/db";
import { useOrganizationEvidenceTasks } from "../../hooks/useEvidenceTasks";
import { ALL_DEPARTMENTS } from "../../constants";
import { ALL_FREQUENCIES } from "../../constants";
import type { EvidenceTaskRow } from "../components/table";

interface Assignee {
	id: string;
	name: string | null;
	image: string | null;
}

interface EvidenceTableContextType {
	// State
	search: string | null;
	status: string | null;
	frequency: string | null;
	department: string | null;
	assigneeId: string | null;
	relevance: string | null;
	page: string;
	pageSize: string;

	// Setters
	setSearch: (value: string | null) => void;
	setStatus: (value: string | null) => void;
	setFrequency: (value: string | null) => void;
	setDepartment: (value: string | null) => void;
	setAssigneeId: (value: string | null) => void;
	setRelevance: (value: string | null) => void;
	setPage: (value: string) => void;
	setPageSize: (value: string) => void;
	mutate: () => void;

	// Data
	evidenceTasks: EvidenceTaskRow[] | undefined;
	pagination:
		| {
				totalCount: number;
				totalPages: number;
				hasNextPage: boolean;
				hasPreviousPage: boolean;
		  }
		| undefined;
	isLoading: boolean;
	isSearching: boolean;
	error: Error | undefined;

	// Derived data
	frequencies: Frequency[];
	departments: Departments[];
	assignees: Assignee[];
	hasActiveFilters: boolean;

	// Actions
	clearFilters: () => void;
}

const EvidenceTableContext = createContext<
	EvidenceTableContextType | undefined
>(undefined);

export function EvidenceTableProvider({ children }: { children: ReactNode }) {
	// Query state
	const [search, setSearch] = useQueryState("search");
	const [status, setStatus] = useQueryState("status");
	const [frequency, setFrequency] = useQueryState("frequency");
	const [department, setDepartment] = useQueryState("department");
	const [assigneeId, setAssigneeId] = useQueryState("assigneeId");
	const [relevance, setRelevance] = useQueryState("relevance");
	const [page, setPage] = useQueryState("page", { defaultValue: "1" });
	const [pageSize, setPageSize] = useQueryState("pageSize", {
		defaultValue: "10",
	});

	// Track if this is initial load or a search/filter update
	const initialLoadCompleted = useRef(false);
	const [isSearching, setIsSearching] = useState(false);

	const currentPage = Number.parseInt(page, 10);
	const currentPageSize = Number.parseInt(pageSize, 10);

	// Fetch data
	const {
		data: rawEvidenceTasks,
		pagination,
		isLoading,
		error,
		mutate,
	} = useOrganizationEvidenceTasks({
		search,
		status: status as "published" | "draft" | null,
		frequency: frequency as any,
		department: department as any,
		assigneeId,
		relevance: relevance as "relevant" | "not-relevant" | null,
		page: currentPage,
		pageSize: currentPageSize,
	});

	// Track when search params change
	useEffect(() => {
		if (initialLoadCompleted.current) {
			setIsSearching(true);
		}
	}, [
		search,
		status,
		frequency,
		department,
		assigneeId,
		relevance,
		page,
		pageSize,
	]);

	// Track when loading changes
	useEffect(() => {
		if (isLoading === false) {
			// Small delay to ensure UI transitions properly
			setTimeout(() => {
				initialLoadCompleted.current = true;
				setIsSearching(false);
			}, 50);
		}
	}, [isLoading]);

	// Additional safety reset for isSearching when data changes
	useEffect(() => {
		if (rawEvidenceTasks && isSearching) {
			// If we have data, ensure isSearching is eventually set to false
			const timer = setTimeout(() => {
				setIsSearching(false);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [rawEvidenceTasks, isSearching]);

	// Format data for the table
	const evidenceTasks = useMemo(() => {
		return rawEvidenceTasks?.map((task) => ({
			...task,
			evidence: {
				name: task.name,
			},
		})) as EvidenceTaskRow[] | undefined;
	}, [rawEvidenceTasks]);

	// Predefined frequencies and departments
	const frequencies = useMemo(() => ALL_FREQUENCIES, []);
	const departments = useMemo(() => ALL_DEPARTMENTS, []);

	// Get unique assignees for the dropdown
	const assignees = useMemo(() => {
		if (!evidenceTasks) return [];

		const uniqueAssignees = new Map<
			string,
			{ id: string; name: string | null; image: string | null }
		>();

		for (const task of evidenceTasks) {
			if (task.assignee) {
				uniqueAssignees.set(task.assignee.id, {
					id: task.assignee.id,
					name: task.assignee.name,
					image: task.assignee.image,
				});
			}
		}

		return Array.from(uniqueAssignees.values()).sort((a, b) => {
			return (a.name || "").localeCompare(b.name || "");
		});
	}, [evidenceTasks]);

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		return (
			status !== null ||
			frequency !== null ||
			department !== null ||
			assigneeId !== null ||
			relevance !== null
		);
	}, [status, frequency, department, assigneeId, relevance]);

	// Clear all filters
	const clearFilters = () => {
		setStatus(null);
		setFrequency(null);
		setDepartment(null);
		setAssigneeId(null);
		setRelevance(null);
		setPage("1"); // Reset to first page when clearing filters
	};

	// Create context value including the new isSearching property
	const contextValue = {
		// State
		search,
		status,
		frequency,
		department,
		assigneeId,
		relevance,
		page,
		pageSize,

		// Setters
		setSearch,
		setStatus,
		setFrequency,
		setDepartment,
		setAssigneeId,
		setRelevance,
		setPage,
		setPageSize,
		mutate,

		// Data
		evidenceTasks,
		pagination,
		isLoading,
		isSearching,
		error,

		// Derived data
		frequencies,
		departments,
		assignees,
		hasActiveFilters,

		// Actions
		clearFilters,
	};

	return (
		<EvidenceTableContext.Provider value={contextValue}>
			{children}
		</EvidenceTableContext.Provider>
	);
}

export function useEvidenceTable() {
	const context = useContext(EvidenceTableContext);

	if (context === undefined) {
		throw new Error(
			"useEvidenceTable must be used within an EvidenceTableProvider",
		);
	}

	return context;
}
