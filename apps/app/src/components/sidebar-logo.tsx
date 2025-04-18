"use client";

import { authClient } from "@/utils/auth-client";
import { cn } from "@comp/ui/cn";
import { Icons } from "@comp/ui/icons";
import Link from "next/link";

interface SidebarLogoProps {
	isCollapsed: boolean;
}

export function SidebarLogo({ isCollapsed }: SidebarLogoProps) {
	const session = authClient.useSession();

	const organizationId = session?.data?.session?.activeOrganizationId;

	return (
		<div className={cn("transition-all duration-300 flex items-center")}>
			<Link href={`/${organizationId}`}>
				<Icons.Logo
					width={45}
					height={45}
					className={cn("transition-transform duration-300")}
				/>
			</Link>
		</div>
	);
}
