import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import * as z from "zod";

import { Policy, PolicyStatus } from "@trycompai/db";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(50),
  sort: getSortingStateParser<Policy>().withDefault([
    { id: "createdAt", desc: true },
  ]),
  name: parseAsString.withDefault(""),
  status: parseAsArrayOf(
    parseAsStringEnum(Object.values(PolicyStatus)),
  ).withDefault([]),
  createdAt: parseAsArrayOf(parseAsIsoDateTime).withDefault([]),
  updatedAt: parseAsArrayOf(parseAsIsoDateTime).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export const createPolicySchema = z.object({
  name: z.string(),
  status: z.enum(PolicyStatus),
});

export type GetPolicySchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
export type CreatePolicySchema = z.infer<typeof createPolicySchema>;
