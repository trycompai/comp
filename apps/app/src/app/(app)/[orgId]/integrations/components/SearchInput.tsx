"use client";

import { Search, X } from "lucide-react";

import { cn } from "@trycompai/ui/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="border-input bg-background relative flex min-h-[40px] w-full items-center rounded-md border">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="text-muted-foreground h-4 w-4" />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground w-full border-0 bg-transparent py-2 pr-10 pl-10 text-sm outline-none"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute inset-y-0 right-0 flex touch-manipulation items-center pr-3"
            type="button"
            aria-label="Clear search"
          >
            <X className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}
