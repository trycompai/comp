import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import { Departments, Vendor, VendorStatus } from '@db';
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server';

export const vendorsSearchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(50),
  sort: getSortingStateParser<Vendor>().withDefault([
    { id: 'name', desc: false }, // Default sort by name ascending
  ]),
  // Basic filters (can be extended)
  name: parseAsString.withDefault(''), // For potential name search filter
  status: parseAsStringEnum<VendorStatus>(Object.values(VendorStatus)),
  department: parseAsStringEnum<Departments>(Object.values(Departments)),
  assigneeId: parseAsString,

  // Advanced filter (from DataTable)
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and'),
});

export type GetVendorsSchema = Awaited<ReturnType<typeof vendorsSearchParamsCache.parse>>;
