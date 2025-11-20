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

import { Risk } from "@trycompai/db";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(50),
  sort: getSortingStateParser<Risk>().withDefault([
    { id: "title", desc: true },
  ]),
  title: parseAsString.withDefault(""),
  lastUpdated: parseAsArrayOf(parseAsIsoDateTime).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetRiskSchema = Awaited<ReturnType<typeof searchParamsCache.parse>>;
