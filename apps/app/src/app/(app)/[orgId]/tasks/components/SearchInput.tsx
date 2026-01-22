'use client';

import { Search } from 'lucide-react';
import { forwardRef } from 'react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = 'Search...', className = '', ...props }, ref) => {
    return (
      <div className="relative group">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={`h-9 w-full border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md ${className}`}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
