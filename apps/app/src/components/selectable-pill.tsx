"use client";

import { Plus, X } from "lucide-react";

import { cn } from "@trycompai/ui/cn";

type SelectablePillProps = {
  label: string;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
};

export function SelectablePill({
  label,
  isSelected,
  onSelectionChange,
  className,
  disabled = false,
  showIcon = false,
}: SelectablePillProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelectionChange(!isSelected)}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
        "hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
        isSelected
          ? "bg-primary/10 text-foreground border-primary border shadow-sm"
          : "border-border text-foreground hover:bg-muted/30 border",
        className,
      )}
    >
      {label}
      {showIcon && (
        <span className="ml-1">
          {isSelected ? (
            <X className="h-3 w-3" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border">
              <Plus className="h-3 w-3 text-black" />
            </div>
          )}
        </span>
      )}
    </button>
  );
}
