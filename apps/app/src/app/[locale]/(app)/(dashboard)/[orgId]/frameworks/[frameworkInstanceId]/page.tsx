import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PageWithBreadcrumb from "../../../../../../../components/pages/PageWithBreadcrumb";
import { getSingleFrameworkInstanceWithControls } from "../data/getSingleFrameworkInstanceWithControls";
import { FrameworkOverview } from "./components/FrameworkOverview";
import { FrameworkRequirements } from "./components/FrameworkRequirements";
import { db } from "@comp/db";

interface PageProps {
	params: Promise<{
		frameworkInstanceId: string;
	}>;
}

export default async function FrameworkPage({ params }: PageProps) {
	const { frameworkInstanceId } = await params;

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

	const frameworkName = frameworkInstanceWithControls.framework.name;

	const tasks = await db.task.findMany({
		where: {
			organizationId,
			controls: {
				some: {
					id: frameworkInstanceWithControls.id,
				},
			},
		},
		include: {
			controls: true,
		},
	});

	return (
		<PageWithBreadcrumb
			breadcrumbs={[
				{ label: "Frameworks", href: `/${organizationId}/frameworks` },
				{ label: frameworkName, current: true },
			]}
		>
			<div className="flex flex-col gap-6">
				<FrameworkOverview
					frameworkInstanceWithControls={
						frameworkInstanceWithControls
					}
					tasks={tasks || []}
				/>
				<FrameworkRequirements
					frameworkId={frameworkInstanceWithControls.frameworkId}
					frameworkInstanceWithControls={
						frameworkInstanceWithControls
					}
				/>
			</div>
		</PageWithBreadcrumb>
	);
}
