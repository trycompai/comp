import { auth } from "@/auth";
import { getOrganizations } from "@/data/getOrganizations";
import { frameworks } from "@bubba/data";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MainMenu } from "./main-menu";
import { OrganizationSwitcher } from "./organization-switcher";
import { SidebarCollapseButton } from "./sidebar-collapse-button";
import { SidebarLogo } from "./sidebar-logo";

export async function Sidebar() {
	const session = await auth();
	const user = session?.user;
	const organizationId = user?.organizationId;
	const cookieStore = await cookies();
	const isCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

	if (!organizationId) {
		redirect("/");
	}

	const { organizations } = await getOrganizations();

	return (
		<div className="h-full flex flex-col gap-0">
			<div className="p-4 flex flex-col gap-0">
				<div className="flex items-center justify-between">
					<SidebarLogo
						isCollapsed={isCollapsed}
						organizationId={organizationId}
					/>
					{!isCollapsed && <SidebarCollapseButton isCollapsed={isCollapsed} />}
				</div>
				<MainMenu
					userIsAdmin={user?.isAdmin ?? false}
					organizationId={organizationId}
					isCollapsed={isCollapsed}
				/>
			</div>
			<div className="flex-1" />
			{isCollapsed && (
				<div className="flex justify-center border-b border-border py-2">
					<SidebarCollapseButton isCollapsed={isCollapsed} />
				</div>
			)}

			<div className="flex h-[60px] items-center mx-auto w-full pb-1">
				<OrganizationSwitcher
					organizations={organizations}
					organizationId={organizationId}
					frameworks={frameworks}
					isCollapsed={isCollapsed}
				/>
			</div>
		</div>
	);
}
