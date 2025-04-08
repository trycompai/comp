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
import { ResidualRiskForm } from "@/app/[locale]/(app)/(dashboard)/[orgId]/vendors/[vendorId]/forms/risks/ResidualRiskForm";
import type { Vendor } from "@comp/db/types";
import { useQueryState } from "nuqs";

export function VendorResidualRiskSheet({
	vendorId,
	initialRisk,
}: {
	vendorId: string;
	initialRisk?: Vendor;
}) {
	const t = useI18n();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [isOpen, setOpen] = useQueryState("residual-risk-sheet");
	const open = isOpen === "true";

	if (isDesktop) {
		return (
			<Sheet
				open={open}
				onOpenChange={(value) => setOpen(value ? "true" : "false")}
			>
				<SheetContent stack>
					<SheetHeader className="mb-8">
						<div className="flex justify-between items-center flex-row">
							<SheetTitle>{t("vendors.risks.update_residual_risk")}</SheetTitle>
							<Button
								size="icon"
								variant="ghost"
								className="p-0 m-0 size-auto hover:bg-transparent"
								onClick={() => setOpen("false")}
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
						<SheetDescription>
							{t("vendors.risks.update_residual_risk_description")}
						</SheetDescription>
					</SheetHeader>

					<ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
						<ResidualRiskForm
							vendorId={vendorId}
							initialProbability={initialRisk?.residualProbability}
							initialImpact={initialRisk?.residualImpact}
						/>
					</ScrollArea>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Drawer open={open}>
			<DrawerTitle hidden>
				{t("vendors.risks.update_residual_risk")}
			</DrawerTitle>
			<DrawerContent className="p-6">
				<ResidualRiskForm
					vendorId={vendorId}
					initialProbability={initialRisk?.residualProbability}
					initialImpact={initialRisk?.residualImpact}
				/>
			</DrawerContent>
		</Drawer>
	);
}
