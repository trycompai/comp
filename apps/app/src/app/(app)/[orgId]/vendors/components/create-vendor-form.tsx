'use client';

import { researchVendorAction } from '@/actions/research-vendor';
import { SelectAssignee } from '@/components/SelectAssignee';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import type { GlobalVendors } from '@db';
import { type Member, type User, VendorCategory, VendorStatus } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createVendorAction } from '../actions/create-vendor-action';
import { searchGlobalVendorsAction } from '../actions/search-global-vendors-action';

const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('URL must be valid and start with https://').optional(),
  description: z.string().optional(),
  category: z.nativeEnum(VendorCategory),
  status: z.nativeEnum(VendorStatus),
  assigneeId: z.string().optional(),
});

export function CreateVendorForm({ assignees }: { assignees: (Member & { user: User })[] }) {
  const [_, setCreateVendorSheet] = useQueryState('createVendorSheet');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalVendors[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const createVendor = useAction(createVendorAction, {
    onSuccess: async () => {
      toast.success('Vendor created successfully');
      setCreateVendorSheet(null);
    },
    onError: () => {
      toast.error('Failed to create vendor');
    },
  });

  const researchVendor = useAction(researchVendorAction);

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

  const form = useForm<z.infer<typeof createVendorSchema>>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: '',
      website: '',
      description: '',
      category: VendorCategory.cloud,
      status: VendorStatus.not_assessed,
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: z.infer<typeof createVendorSchema>) => {
    createVendor.execute(data);

    if (data.website) {
      await researchVendor.execute({
        website: data.website,
      });
    }
  };

  const handleSelectVendor = (vendor: GlobalVendors) => {
    form.setValue('name', vendor.company_name ?? vendor.legal_name ?? '');
    form.setValue('website', vendor.website ?? '');
    form.setValue('description', vendor.company_description ?? '');
    setSearchQuery(vendor.company_name ?? vendor.legal_name ?? '');
    setSearchResults([]);
    setPopoverOpen(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['vendor']}>
              <AccordionItem value="vendor">
                <AccordionTrigger>{'Vendor Details'}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
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
                                  if (
                                    searchQuery.trim().length > 1 &&
                                    (isSearching ||
                                      searchResults.length > 0 ||
                                      (!isSearching && searchResults.length === 0))
                                  ) {
                                    setPopoverOpen(true);
                                  }
                                }}
                                autoFocus
                              />
                              {popoverOpen && (
                                <div className="bg-background absolute top-full z-10 mt-1 w-full rounded-md border shadow-lg">
                                  <div className="max-h-[300px] overflow-y-auto p-1">
                                    {isSearching && (
                                      <div className="text-muted-foreground p-2 text-sm">
                                        {'Loading...'}...
                                      </div>
                                    )}
                                    {!isSearching && searchResults.length > 0 && (
                                      <>
                                        <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                                          {'Suggestions'}
                                        </p>
                                        {searchResults.map((vendor) => (
                                          <div
                                            key={
                                              vendor.website ??
                                              vendor.company_name ??
                                              vendor.legal_name ??
                                              Math.random().toString()
                                            }
                                            className="hover:bg-accent cursor-pointer rounded-sm p-2 text-sm"
                                            onMouseDown={() => {
                                              handleSelectVendor(vendor);
                                              setPopoverOpen(false);
                                            }}
                                          >
                                            {vendor.company_name ??
                                              vendor.legal_name ??
                                              vendor.website}
                                          </div>
                                        ))}
                                      </>
                                    )}
                                    {!isSearching &&
                                      searchQuery.trim().length > 1 &&
                                      searchResults.length === 0 && (
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
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Website'}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="mt-3"
                              placeholder={'https://example.com'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Description'}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="mt-3 min-h-[80px]"
                              placeholder={'Enter a description for the vendor...'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Category'}</FormLabel>
                          <FormControl>
                            <div className="mt-3">
                              <Select {...field} value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder={'Select a category...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(VendorCategory).map((category) => {
                                    const formattedCategory = category
                                      .toLowerCase()
                                      .split('_')
                                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(' ');
                                    return (
                                      <SelectItem key={category} value={category}>
                                        {formattedCategory}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Status'}</FormLabel>
                          <FormControl>
                            <div className="mt-3">
                              <Select {...field} value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder={'Select a status...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(VendorStatus).map((status) => {
                                    const formattedStatus = status
                                      .toLowerCase()
                                      .split('_')
                                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(' ');
                                    return (
                                      <SelectItem key={status} value={status}>
                                        {formattedStatus}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Assignee'}</FormLabel>
                          <FormControl>
                            <div className="mt-3">
                              <SelectAssignee
                                assignees={assignees}
                                assigneeId={field.value ?? null}
                                withTitle={false}
                                onAssigneeChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="default" disabled={createVendor.status === 'executing'}>
              <div className="flex items-center justify-center">
                {'Create Vendor'}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
