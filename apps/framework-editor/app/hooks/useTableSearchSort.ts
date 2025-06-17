import { useMemo, useState } from 'react';
import type { SortConfig, SortDirection } from '../types/common';

export function useTableSearchSort<
  TData extends Record<string, any>,
  TKey extends keyof TData & string,
>(
  inputData: TData[],
  searchableKeys: TKey[],
  sortConfig?: SortConfig<TKey>,
  defaultSortColumnKey?: TKey | null,
  defaultSortDirection?: SortDirection,
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumnKey, setSortColumnKey] = useState<TKey | null>(defaultSortColumnKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection ?? 'asc');

  const processedData = useMemo(() => {
    let dataToProcess = [...inputData];

    // Filter
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      dataToProcess = dataToProcess.filter((item) =>
        searchableKeys.some((key) => {
          const value = item[key];
          return typeof value === 'string' && value.toLowerCase().includes(lowerSearchTerm);
        }),
      );
    }

    // Sort
    if (sortColumnKey) {
      const columnSortConfig = sortConfig?.[sortColumnKey];

      dataToProcess.sort((a, b) => {
        const valA = a[sortColumnKey];
        const valB = b[sortColumnKey];

        let comparison = 0;

        if (valA === null && valB === null) comparison = 0;
        else if (valA === null) comparison = sortDirection === 'asc' ? -1 : 1;
        else if (valB === null) comparison = sortDirection === 'asc' ? 1 : -1;
        else if (columnSortConfig === 'number') {
          // Ensure values are numbers or can be parsed to numbers
          let numA: number;
          let numB: number;

          // Check if valA is a Date-like object
          if (
            typeof valA === 'object' &&
            valA !== null &&
            typeof (valA as any).getTime === 'function'
          ) {
            numA = (valA as Date).getTime();
          } else {
            numA = typeof valA === 'number' ? valA : parseFloat(valA as string);
          }

          // Check if valB is a Date-like object
          if (
            typeof valB === 'object' &&
            valB !== null &&
            typeof (valB as any).getTime === 'function'
          ) {
            numB = (valB as Date).getTime();
          } else {
            numB = typeof valB === 'number' ? valB : parseFloat(valB as string);
          }

          if (isNaN(numA) && isNaN(numB)) comparison = 0;
          else if (isNaN(numA))
            comparison = sortDirection === 'asc' ? 1 : -1; // Treat NaN as greater
          else if (isNaN(numB)) comparison = sortDirection === 'asc' ? -1 : 1;
          else comparison = numA - numB;
        } else {
          // Default to string comparison
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    return dataToProcess;
  }, [inputData, searchTerm, sortColumnKey, sortDirection, searchableKeys, sortConfig]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return {
    searchTerm,
    setSearchTerm,
    sortColumnKey,
    setSortColumnKey,
    sortDirection,
    setSortDirection, // also exposing direct setter if needed
    toggleSortDirection,
    processedData,
  };
}
