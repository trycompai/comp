import { OrganizationSwitcher } from "@/components/organization-switcher";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { FrameworkEditorFramework } from "@comp/db/types";

export default async function NoAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return redirect("/");
	}

	const organizations = await db.organization.findMany({
		where: {
			members: {
				some: {
					userId: session.user.id,
				},
			},
		},
	});

	const currentOrg = await db.organization.findUnique({
		where: {
			id: session.session.activeOrganizationId,
		},
	});

	const frameworks = await db.frameworkEditorFramework.findMany({
		select: {
			id: true,
			name: true,
			description: true,
			version: true,
		},
	});

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-foreground/05 gap-4">
			<h1 className="text-2xl font-bold">Access Denied</h1>
			<div className="flex flex-col text-center">
				<p>
					<b>Employees</b> don't have access to app.trycomp.ai, did
					you mean to go to{" "}
					<Link
						href="https://portal.trycomp.ai"
						className="underline text-primary"
					>
						portal.trycomp.ai
					</Link>
					?
				</p>
				<p>
					Please select another organization or contact your
					organization administrator.
				</p>
			</div>
			<div>
				<OrganizationSwitcher
					organizations={organizations}
					organization={currentOrg}
					frameworks={frameworks}
				/>
			</div>
		</div>
	);
}
