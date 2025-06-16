// General types for sorting and toolbar options, potentially used across different tables/toolbars

export type SortDirection = "asc" | "desc";

export interface SortableColumnOption {
  value: string; // Represents the key of the column to sort by
  label: string; // Display label for the sort option
}

/**
 * Configuration for how specific columns should be sorted.
 * TKey is a union of the sortable string keys for a given data type TData.
 * For each key, specifies if it should be sorted as a 'number' or 'string' (default).
 */
export type SortConfig<TKey extends string> = Partial<
  Record<TKey, "string" | "number">
>;
