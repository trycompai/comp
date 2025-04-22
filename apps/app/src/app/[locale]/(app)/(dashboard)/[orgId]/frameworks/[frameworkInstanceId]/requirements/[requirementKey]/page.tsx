import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSingleFrameworkInstanceWithControls } from "../../../data/getSingleFrameworkInstanceWithControls";
import { getFrameworkDetails } from "../../../lib/getFrameworkDetails";
import { getFrameworkRequirements } from "../../../lib/getFrameworkRequirements";
import { RequirementControls } from "./components/RequirementControls";

interface PageProps {
	params: Promise<{
		frameworkInstanceId: string;
		requirementKey: string;
	}>;
}

interface RequirementWithName {
	name: string;
}

export default async function RequirementPage({ params }: PageProps) {
	const { frameworkInstanceId, requirementKey } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/");
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		redirect("/");
	}

	const frameworkInstanceWithControls =
		await getSingleFrameworkInstanceWithControls({
			organizationId,
			frameworkInstanceId,
		});

	if (!frameworkInstanceWithControls) {
		redirect("/");
	}

	const requirements = getFrameworkRequirements(
		frameworkInstanceWithControls.frameworkId,
	);
	const requirement =
		requirements[requirementKey as keyof typeof requirements];

	if (!requirement) {
		redirect(`/${organizationId}/frameworks/${frameworkInstanceId}`);
	}

	const frameworkName = getFrameworkDetails(
		frameworkInstanceWithControls.frameworkId,
	).name;

	const siblingRequirements = Object.keys(requirements).filter(
		(req) => req !== requirementKey,
	);

	const siblingRequirementsDropdown = siblingRequirements.map((req) => {
		const reqKey = req as keyof typeof requirements;
		const currentReq = requirements[reqKey] as RequirementWithName;
		return {
			label: currentReq.name,
			href: `/${organizationId}/frameworks/${frameworkInstanceId}/requirements/${req}`,
		};
	});

	return (
		<PageWithBreadcrumb
			breadcrumbs={[
				{ label: "Frameworks", href: `/${organizationId}/frameworks` },
				{
					label: frameworkName,
					href: `/${organizationId}/frameworks/${frameworkInstanceId}`,
				},
				{
					label: (requirement as RequirementWithName).name,
					dropdown: siblingRequirementsDropdown,
					current: true,
				},
			]}
		>
			<div className="flex flex-col gap-6">
				<RequirementControls
					requirement={requirement}
					requirementKey={requirementKey}
					frameworkInstanceWithControls={
						frameworkInstanceWithControls
					}
				/>
			</div>
		</PageWithBreadcrumb>
	);
}
