"use client";

import { Button } from "@comp/ui/button";
import { Icons } from "@comp/ui/icons";
import { Sheet, SheetContent } from "@comp/ui/sheet";
import { useState } from "react";
import { MainMenu } from "./main-menu";
import { OrganizationSwitcher } from "./organization-switcher";
import { Organization as AuthOrganization } from "better-auth/plugins";
import type { Organization as DbOrganization, FrameworkEditorFramework } from "@comp/db/types";

interface MobileMenuProps {
	organizations: AuthOrganization[];
	isCollapsed?: boolean;
	completedOnboarding: boolean;
	organizationId: string;
	frameworks: Pick<FrameworkEditorFramework, "id" | "name" | "description" | "version">[];
}

export function MobileMenu({
	organizationId,
	completedOnboarding,
	organizations,
	frameworks
}: MobileMenuProps) {
	const [isOpen, setOpen] = useState(false);

	const handleCloseSheet = () => {
		setOpen(false);
	};

	const adaptedOrganizations: DbOrganization[] = organizations.map(org => ({
		...org,
		logo: org.logo ?? null,
		metadata: org.metadata ? String(org.metadata) : null,
		stripeCustomerId: null,
		website: null,
	}));

	const currentOrganization = adaptedOrganizations.find(org => org.id === organizationId) || null;

	return (
		<Sheet open={isOpen} onOpenChange={setOpen}>
			<div>
				<Button
					variant="outline"
					size="icon"
					onClick={() => setOpen(true)}
					className="rounded-full w-8 h-8 items-center relative flex md:hidden"
				>
					<Icons.Menu size={16} />
				</Button>
			</div>
			<SheetContent side="left" className="border-none rounded-sm -ml-2">
				<div className="ml-2 mb-8">
					<Icons.Logo />
				</div>
				<div className="flex flex-col gap-2">
					<OrganizationSwitcher
						organizations={adaptedOrganizations}
						organization={currentOrganization}
						isCollapsed={false}
						frameworks={frameworks}
					/>
					<MainMenu
						organizationId={organizationId}
						completedOnboarding={completedOnboarding}
						onItemClick={handleCloseSheet}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
