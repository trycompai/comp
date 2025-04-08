import { getI18n } from "@/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import type { SearchParams } from "@/types";
import { searchParamsCache } from "./data/validations";
import { getValidFilters } from "@/lib/data-table";
import { getEvidence } from "./data/queries";
import { EvidenceTable } from "./components/evidence-table";

interface PolicyTableProps {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}

export default async function PoliciesPage({
	params,
	...props
}: PolicyTableProps) {
	const { locale } = await params;
	const searchParams = await props.searchParams;
	const search = searchParamsCache.parse(searchParams);
	const validFilters = getValidFilters(search.filters);

	setStaticParamsLocale(locale);

	const promises = Promise.all([
		getEvidence({
			...search,
			filters: validFilters,
		}),
	]);

	return (
		<>
			<EvidenceTable promises={promises} />
		</>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;

	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("sidebar.evidence"),
	};
}
