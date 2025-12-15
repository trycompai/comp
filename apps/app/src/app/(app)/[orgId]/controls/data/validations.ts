import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import { Control } from '@db';
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server';
import * as z from 'zod/v3';

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(50),
  sort: getSortingStateParser<Control>().withDefault([{ id: 'name', desc: true }]),
  name: parseAsString.withDefault(''),
  lastUpdated: parseAsArrayOf(z.coerce.date()).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and'),
});

export type GetControlSchema = Awaited<ReturnType<typeof searchParamsCache.parse>>;
