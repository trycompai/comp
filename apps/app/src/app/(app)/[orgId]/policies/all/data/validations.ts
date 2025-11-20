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
    { id: "name", desc: false },
  ]),
  name: parseAsString.withDefault(""),
  status: parseAsArrayOf(
    parseAsStringEnum(Object.values(PolicyStatus)),
  ).withDefault([]),
  createdAt: parseAsArrayOf(parseAsIsoDateTime).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetPolicySchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
