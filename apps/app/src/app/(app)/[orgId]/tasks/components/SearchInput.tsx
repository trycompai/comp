"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = "Search...", className = "", ...props }, ref) => {
    return (
      <div className="group relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={`border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring h-9 w-[280px] rounded-md border pr-4 pl-10 text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
