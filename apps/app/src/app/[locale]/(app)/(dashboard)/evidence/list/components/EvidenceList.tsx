"use client";

import { useEvidenceTable } from "../hooks/useEvidenceTableContext";
import {
	EvidenceListEmpty,
	EvidenceListError,
	EvidenceListSkeleton,
} from "./EvidenceListUIStates";
import { FilterDropdown, SearchInput } from "./table/EvidenceFilters";
import { PaginationControls } from "./table/EvidenceFilters/PaginationControls";
import { EvidenceListTable } from "./table/EvidenceListTable";
import { SkeletonTable } from "./table/SkeletonTable";
import { useEffect, useRef, useState } from "react";

export function EvidenceList() {
	const {
		evidenceTasks,
		isLoading,
		isSearching,
		error,
		mutate,
		hasActiveFilters,
		clearFilters,
		pagination,
		search,
	} = useEvidenceTable();

	const hasDataRef = useRef(false);
	const hasSearchRef = useRef(false);
	// Add a stabilization delay to prevent flashing states
	const [isStabilized, setIsStabilized] = useState(true);

	// Keep track of whether we've ever had data
	useEffect(() => {
		if (evidenceTasks && evidenceTasks.length > 0) {
			hasDataRef.current = true;
		}
	}, [evidenceTasks]);

	// Handle search state transitions
	useEffect(() => {
		if (search) {
			hasSearchRef.current = true;
			// When search changes, we're not stabilized
			setIsStabilized(false);
		} else if (hasSearchRef.current && !search) {
			// If search was set but is now cleared, force a refresh
			hasSearchRef.current = false;
			setIsStabilized(false);
			setTimeout(() => {
				mutate();
			}, 0);
		}
	}, [search, mutate]);

	// Stabilize state after loading/searching completes
	useEffect(() => {
		if (isLoading || isSearching) {
			// When loading or searching, we're not stabilized
			setIsStabilized(false);
		} else {
			// Add a small delay before considering the state stabilized
			// This prevents flashing of empty states
			const timer = setTimeout(() => {
				setIsStabilized(true);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isLoading, isSearching]);

	// Show loading state if it's the initial load and not a search/filter update
	if (isLoading && !isSearching && !hasDataRef.current) {
		return <EvidenceListSkeleton />;
	}

	if (error) {
		return <EvidenceListError error={error} onRetry={mutate} />;
	}

	// Determine what to render in the table area
	const renderTableContent = () => {
		// Always show skeleton during active searches or when not stabilized
		if (isSearching || isLoading || !isStabilized) {
			return <SkeletonTable />;
		}

		// Only show empty state when we're stabilized, not searching, not loading, and have no data
		if ((!evidenceTasks || evidenceTasks.length === 0) && isStabilized) {
			return (
				<EvidenceListEmpty
					hasFilters={hasActiveFilters}
					onClearFilters={clearFilters}
				/>
			);
		}

		// Show data table when we have data and are in a stable state
		return <EvidenceListTable data={evidenceTasks || []} />;
	};

	return (
		<div className="space-y-4 w-full max-w-full">
			<div className="flex items-center gap-3">
				<div className="w-full max-w-md">
					<SearchInput />
				</div>
				<FilterDropdown />
			</div>

			<div className="w-full max-w-full">
				{renderTableContent()}
				{pagination && !isSearching && isStabilized && <PaginationControls />}
			</div>
		</div>
	);
}
