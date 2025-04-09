import type { TechStackOption } from "./home.types";

export type Option = TechStackOption;

export interface MultiSelectCardGridProps {
  options: Option[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  className?: string;
}
