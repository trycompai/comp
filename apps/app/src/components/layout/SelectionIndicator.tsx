"use client";

import { Check } from "lucide-react";

import { cn } from "@trycompai/ui/cn";

interface SelectionIndicatorProps {
  isSelected: boolean;
  className?: string;
  variant?: "radio" | "checkbox";
}

export function SelectionIndicator({
  isSelected,
  className,
  variant = "radio",
}: SelectionIndicatorProps) {
  return (
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center border-2 transition-all",
        variant === "radio" ? "rounded-full" : "rounded-md",
        isSelected
          ? "border-green-500 bg-transparent"
          : "border-muted-foreground/50 bg-transparent",
        className,
      )}
    >
      {isSelected && <Check className="h-4 w-4 text-green-500" />}
    </div>
  );
}
