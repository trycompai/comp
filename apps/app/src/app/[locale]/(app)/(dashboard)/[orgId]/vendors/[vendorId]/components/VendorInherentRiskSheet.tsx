"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@comp/ui/drawer";
import { useMediaQuery } from "@comp/ui/hooks";
import { ScrollArea } from "@comp/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@comp/ui/sheet";
import { X } from "lucide-react";
import { InherentRiskForm } from "@/app/[locale]/(app)/(dashboard)/[orgId]/vendors/[vendorId]/forms/risks/InherentRiskForm";
import { Impact, Likelihood } from "@prisma/client";
import { useQueryState } from "nuqs";

export function VendorInherentRiskSheet({
	vendorId,
	initialProbability,
	initialImpact,
}: {
	vendorId: string;
	initialProbability?: Likelihood;
	initialImpact?: Impact;
}) {
	const t = useI18n();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setOpen] = useQueryState("inherent-risk-sheet");

	if (isDesktop) {
		return (
			<Sheet
				open={isOpen === "true"}
				onOpenChange={(value) => setOpen(value ? "true" : null)}
			>
				<SheetContent stack>
					<SheetHeader className="mb-8">
						<div className="flex justify-between items-center flex-row">
							<SheetTitle>{t("vendors.risks.update_inherent_risk")}</SheetTitle>
							<Button
								size="icon"
								variant="ghost"
								className="p-0 m-0 size-auto hover:bg-transparent"
								onClick={() => setOpen(null)}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
						<SheetDescription>
							{t("vendors.risks.update_inherent_risk_description")}
						</SheetDescription>
					</SheetHeader>

					<ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
						<InherentRiskForm
							vendorId={vendorId}
							initialProbability={initialProbability}
							initialImpact={initialImpact}
						/>
					</ScrollArea>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Drawer
			open={isOpen === "true"}
			onOpenChange={(value) => setOpen(value ? "true" : null)}
		>
			<DrawerTitle hidden>
				{t("vendors.risks.update_inherent_risk")}
			</DrawerTitle>
			<DrawerContent className="p-6">
				<InherentRiskForm
					vendorId={vendorId}
					initialProbability={initialProbability}
					initialImpact={initialImpact}
				/>
			</DrawerContent>
		</Drawer>
	);
}
