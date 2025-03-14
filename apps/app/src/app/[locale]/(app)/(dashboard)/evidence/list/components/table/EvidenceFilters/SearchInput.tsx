"use client";

import { Input } from "@bubba/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useEvidenceTable } from "../../../hooks/useEvidenceTableContext";

interface SearchInputProps {
	placeholder?: string;
}

export function SearchInput({
	placeholder = "Search evidence...",
}: SearchInputProps) {
	const { search, setSearch, setPage, isSearching, mutate } =
		useEvidenceTable();
	const [inputValue, setInputValue] = useState(search || "");
	const [debouncedValue] = useDebounce(inputValue, 500);
	const inputRef = useRef<HTMLInputElement>(null);
	const isPendingRef = useRef(false);
	const previousSearchRef = useRef<string | null>(search);

	// Handle search changes with proper state management
	useEffect(() => {
		// Only trigger a new search if the value has actually changed
		if (debouncedValue === previousSearchRef.current) {
			return;
		}

		// Track that we're about to make a change
		isPendingRef.current = true;

		// Update the previous search reference
		previousSearchRef.current = debouncedValue || null;

		// Handle empty search differently
		if (!debouncedValue || debouncedValue.trim() === "") {
			setSearch(null);
			// Force a data refresh to ensure we exit loading state
			setTimeout(() => {
				mutate();
				isPendingRef.current = false;
			}, 0);
		} else {
			setSearch(debouncedValue);
			isPendingRef.current = false;
		}

		// Always reset to first page on search change
		setPage("1");
	}, [debouncedValue, setSearch, setPage, mutate]);

	// Maintain focus when search changes
	useEffect(() => {
		// If input has focus, keep it focused during search transitions
		if (document.activeElement === inputRef.current && inputRef.current) {
			requestAnimationFrame(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					const length = inputRef.current.value.length;
					inputRef.current.setSelectionRange(length, length);
				}
			});
		}

		// If search is complete and we're not pending, ensure we exit loading state
		if (!isSearching && !isPendingRef.current && inputValue === "") {
			mutate();
		}
	}, [isSearching, inputValue, mutate]);

	// Handle input changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setInputValue(newValue);

		// Special case: immediately trigger search when clearing input
		if (newValue === "" && inputValue !== "") {
			setSearch(null);
			mutate();
			setPage("1");
		}
	};

	return (
		<div className="relative">
			<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
			<Input
				ref={inputRef}
				type="search"
				placeholder={placeholder}
				className="w-full pl-8 h-10"
				value={inputValue}
				onChange={handleInputChange}
			/>
		</div>
	);
}
