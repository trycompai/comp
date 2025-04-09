"use client";

import { Button } from "@comp/ui/button";
import { Icons } from "@comp/ui/icons";
import { Sheet, SheetContent } from "@comp/ui/sheet";
import { useState } from "react";
import { MainMenu } from "./MainMenu";
import { getOnboardingForCurrentOrganization } from "@/data/getOnboardingForCurrentOrganization";

export function MobileMenu({
	organizationId,
	isAdmin,
	completedOnboarding,
}: {
	organizationId: string;
	isAdmin?: boolean;
	completedOnboarding: boolean;
}) {
	const [isOpen, setOpen] = useState(false);

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
			<SheetContent side="left" className="border-none rounded-none -ml-2">
				<div className="ml-2 mb-8">
					<Icons.Logo />
				</div>

				<MainMenu
					organizationId={organizationId}
					completedOnboarding={completedOnboarding}
				/>
			</SheetContent>
		</Sheet>
	);
}
