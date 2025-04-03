import { getI18n } from "@/locales/server";
import { auth } from "@comp/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FrameworksOverview } from "./components/FrameworksOverview";
import { getAllFrameworkInstancesWithControls } from "./data/getAllFrameworkInstancesWithControls";
import PageWithBreadcrumb from "../../../../../../components/pages/PageWithBreadcrumb";

export async function generateMetadata() {
	const t = await getI18n();

	return {
		title: t("sidebar.frameworks"),
	};
}

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const organizationId = session?.session.activeOrganizationId;

	if (!organizationId) {
		console.log("Redirect on page.tsx");
		redirect("/");
	}

	const frameworksWithControls = await getAllFrameworkInstancesWithControls({
		organizationId,
	});

	return (
		<PageWithBreadcrumb breadcrumbs={[{ label: "Frameworks", current: true }]}>
			<FrameworksOverview frameworksWithControls={frameworksWithControls} />
		</PageWithBreadcrumb>
	);
}
