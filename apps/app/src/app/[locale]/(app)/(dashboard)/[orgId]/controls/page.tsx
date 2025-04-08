import { getI18n } from "@/locales/server";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { SearchParams } from "nuqs";
import { getValidFilters } from "@/lib/data-table";
import { searchParamsCache } from "./data/validations";
import { getControls } from "./data/queries";
import { ControlsTable } from "./components/controls-table";

interface ControlTableProps {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}

export default async function ControlsPage({
	params,
	...props
}: ControlTableProps) {
	const { locale } = await params;
	const searchParams = await props.searchParams;
	const search = searchParamsCache.parse(searchParams);
	const validFilters = getValidFilters(search.filters);
	setStaticParamsLocale(locale);

	const promises = Promise.all([
		getControls({
			...search,
			filters: validFilters,
		}),
	]);

	return (
		<PageWithBreadcrumb breadcrumbs={[{ label: "Controls", current: true }]}>
			<ControlsTable promises={promises} />
		</PageWithBreadcrumb>
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
		title: t("sidebar.controls"),
	};
}
