import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { getValidFilters } from "@/lib/data-table";
import type { SearchParams } from "@/types";
import type { Metadata } from "next";
import { PoliciesTable } from "./components/policies-table";
import { getPolicies } from "./data/queries";
import { searchParamsCache } from "./data/validations";

interface PolicyTableProps {
  searchParams: Promise<SearchParams>;
}

export default async function PoliciesPage({ ...props }: PolicyTableProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getPolicies({
      ...search,
      filters: validFilters,
    }),
  ]);

  return (
    <PageWithBreadcrumb breadcrumbs={[{ label: "Policies", current: true }]}>
      <PoliciesTable promises={promises} />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Policies",
  };
}
