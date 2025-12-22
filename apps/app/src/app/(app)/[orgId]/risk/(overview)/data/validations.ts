import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import { Risk } from '@db';
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
  sort: getSortingStateParser<Risk>().withDefault([{ id: 'title', desc: true }]),
  title: parseAsString.withDefault(''),
  lastUpdated: parseAsArrayOf(z.coerce.date()).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and'),
});

export type GetRiskSchema = Awaited<ReturnType<typeof searchParamsCache.parse>>;
