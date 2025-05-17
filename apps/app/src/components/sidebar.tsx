import { getOnboardingForCurrentOrganization } from "@/data/getOnboarding";
import { getOrganizations } from "@/data/getOrganizations";
import type { Organization, FrameworkEditorFramework } from "@comp/db/types";
import { cookies } from "next/headers";
import { MainMenu } from "./main-menu";
import { OrganizationSwitcher } from "./organization-switcher";
import { SidebarCollapseButton } from "./sidebar-collapse-button";
import { SidebarLogo } from "./sidebar-logo";
import { db } from "@comp/db";

export async function Sidebar({
	organization,
}: { organization: Organization | null }) {
	const cookieStore = await cookies();
	const isCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";
	const { completedAll } = await getOnboardingForCurrentOrganization();
	const { organizations } = await getOrganizations();
	const frameworks = await db.frameworkEditorFramework.findMany({
		select: {
			id: true,
			name: true,
			description: true,
			version: true,
		},
	});

	return (
		<div className="h-full flex flex-col gap-0">
			<div className="p-4 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<SidebarLogo isCollapsed={isCollapsed} />
					{!isCollapsed && (
						<SidebarCollapseButton isCollapsed={isCollapsed} />
					)}
				</div>
				<div className="flex flex-col gap-2 mt-2">
					<OrganizationSwitcher
						organizations={organizations}
						organization={organization}
						isCollapsed={isCollapsed}
						frameworks={frameworks}
					/>
					<MainMenu
						organizationId={organization?.id ?? ""}
						isCollapsed={isCollapsed}
						completedOnboarding={completedAll}
					/>
				</div>
			</div>
			<div className="flex-1" />
			{isCollapsed && (
				<div className="flex justify-center border-b border-border py-2">
					<SidebarCollapseButton isCollapsed={isCollapsed} />
				</div>
			)}

		</div>
	);
}
