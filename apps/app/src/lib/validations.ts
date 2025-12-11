import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import { Policy, PolicyStatus } from '@db';
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from 'nuqs/server';
import * as z from 'zod';
import * as z3 from 'zod/v3';

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(50),
  sort: getSortingStateParser<Policy>().withDefault([{ id: 'createdAt', desc: true }]),
  name: parseAsString.withDefault(''),
  status: parseAsArrayOf(z3.nativeEnum(PolicyStatus)).withDefault([]),
  createdAt: parseAsArrayOf(z3.coerce.date()).withDefault([]),
  updatedAt: parseAsArrayOf(z3.coerce.date()).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and'),
});

export const createPolicySchema = z.object({
  name: z.string(),
  status: z.nativeEnum(PolicyStatus),
});

export type GetPolicySchema = Awaited<ReturnType<typeof searchParamsCache.parse>>;
export type CreatePolicySchema = z.infer<typeof createPolicySchema>;
