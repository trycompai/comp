"use client";

import { Input } from "@bubba/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useEvidenceTable } from "../../hooks/useEvidenceTableContext";

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "Search evidence...",
}: SearchInputProps) {
  const { search, setSearch, setPage } = useEvidenceTable();
  const [inputValue, setInputValue] = useState(search || "");
  const [debouncedValue] = useDebounce(inputValue, 500);

  // Update search query parameter when debounced value changes
  useEffect(() => {
    if (debouncedValue === "") {
      setSearch(null);
    } else {
      setSearch(debouncedValue);
    }
    setPage("1"); // Reset to first page when searching
  }, [debouncedValue, setSearch, setPage]);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="w-full pl-8 h-10"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
}
