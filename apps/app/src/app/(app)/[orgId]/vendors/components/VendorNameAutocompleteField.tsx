'use client';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import type { GlobalVendors } from '@db';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { searchGlobalVendorsAction } from '../actions/search-global-vendors-action';
import type { CreateVendorFormValues } from './create-vendor-form-schema';

const getVendorDisplayName = (vendor: GlobalVendors): string => {
  return vendor.company_name ?? vendor.legal_name ?? vendor.website ?? '';
};

const normalizeVendorName = (name: string): string => {
  return name.toLowerCase().trim();
};

const getVendorKey = (vendor: GlobalVendors): string => {
  // `website` is the primary key and should always be present.
  if (vendor.website) return vendor.website;

  const name = vendor.company_name || vendor.legal_name || 'unknown';
  const timestamp = vendor.createdAt?.getTime() ?? 0;
  return `${name}-${timestamp}`;
};

type Props = {
  form: UseFormReturn<CreateVendorFormValues>;
  isSheetOpen: boolean;
};

export function VendorNameAutocompleteField({ form, isSheetOpen }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalVendors[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Used to avoid resetting on initial mount.
  const hasOpenedOnceRef = useRef(false);

  const searchVendors = useAction(searchGlobalVendorsAction, {
    onExecute: () => setIsSearching(true),
    onSuccess: (result) => {
      if (result.data?.success && result.data.data?.vendors) {
        setSearchResults(result.data.data.vendors);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    },
    onError: () => {
      setSearchResults([]);
      setIsSearching(false);
    },
  });

  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (query.trim().length > 1) {
      searchVendors.execute({ name: query });
    } else {
      setSearchResults([]);
    }
  }, 300);

  // Reset autocomplete state when the sheet closes.
  useEffect(() => {
    if (isSheetOpen) {
      hasOpenedOnceRef.current = true;
      return;
    }

    if (!hasOpenedOnceRef.current) return;

    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setPopoverOpen(false);
  }, [isSheetOpen]);

  const deduplicatedSearchResults = useMemo(() => {
    if (searchResults.length === 0) return [];

    const seen = new Map<string, GlobalVendors>();

    for (const vendor of searchResults) {
      const displayName = getVendorDisplayName(vendor);
      const normalizedName = normalizeVendorName(displayName);
      const existing = seen.get(normalizedName);

      if (!existing) {
        seen.set(normalizedName, vendor);
        continue;
      }

      // Prefer vendor with more complete data.
      const existingHasCompanyName = !!existing.company_name;
      const currentHasCompanyName = !!vendor.company_name;

      if (!existingHasCompanyName && currentHasCompanyName) {
        seen.set(normalizedName, vendor);
        continue;
      }

      if (existingHasCompanyName === currentHasCompanyName) {
        if (!existing.website && vendor.website) {
          seen.set(normalizedName, vendor);
        }
      }
    }

    return Array.from(seen.values());
  }, [searchResults]);

  const handleSelectVendor = (vendor: GlobalVendors) => {
    // Use same fallback logic as getVendorDisplayName for consistency
    const name = getVendorDisplayName(vendor);

    form.setValue('name', name, { shouldDirty: true, shouldValidate: true });
    form.setValue('website', vendor.website ?? '', { shouldDirty: true, shouldValidate: true });
    form.setValue('description', vendor.company_description ?? '', {
      shouldDirty: true,
      shouldValidate: true,
    });

    setSearchQuery(name);
    setSearchResults([]);
    setPopoverOpen(false);
  };

  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem className="relative flex flex-col">
          <FormLabel>{'Vendor Name'}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                placeholder={'Search or enter vendor name...'}
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  field.onChange(val);
                  debouncedSearch(val);

                  if (val.trim().length > 1) {
                    setPopoverOpen(true);
                  } else {
                    setPopoverOpen(false);
                    setSearchResults([]);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setPopoverOpen(false), 150);
                }}
                onFocus={() => {
                  // Prevent flicker on initial focus: only show if we have results or an active search.
                  if (searchQuery.trim().length > 1 && (isSearching || searchResults.length > 0)) {
                    setPopoverOpen(true);
                  }
                }}
                autoFocus
              />

              {popoverOpen && (
                <div className="bg-background absolute top-full z-10 mt-1 w-full rounded-md border shadow-lg">
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {isSearching && (
                      <div className="text-muted-foreground p-2 text-sm">Loading...</div>
                    )}

                    {!isSearching && deduplicatedSearchResults.length > 0 && (
                      <>
                        <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                          {'Suggestions'}
                        </p>
                        {deduplicatedSearchResults.map((vendor) => (
                          <div
                            key={getVendorKey(vendor)}
                            className="hover:bg-accent cursor-pointer rounded-sm p-2 text-sm"
                            onMouseDown={() => handleSelectVendor(vendor)}
                          >
                            {getVendorDisplayName(vendor)}
                          </div>
                        ))}
                      </>
                    )}

                    {!isSearching &&
                      searchQuery.trim().length > 1 &&
                      deduplicatedSearchResults.length === 0 && (
                        <div
                          className="hover:bg-accent cursor-pointer rounded-sm p-2 text-sm italic"
                          onMouseDown={() => {
                            field.onChange(searchQuery);
                            setSearchResults([]);
                            setPopoverOpen(false);
                          }}
                        >
                          {`Create "${searchQuery}"`}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

