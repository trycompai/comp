"use client";

import type { OrganizationPolicy, Policy } from "@bubba/db/types";
import { useState } from "react";
import { PolicyGrid } from "./PolicyGrid";
import { PolicyCarousel } from "./PolicyCarousel";
import type { Session } from "@/app/lib/auth";
import { Button } from "@bubba/ui/button";
import { ArrowLeft } from "lucide-react";

interface PolicyContainerProps {
	policies: (OrganizationPolicy & { policy: Policy })[];
	user: Session["user"];
}

export function PolicyContainer({ policies, user }: PolicyContainerProps) {
	const [selectedPolicyIndex, setSelectedPolicyIndex] = useState<number | null>(
		null,
	);

	const handlePolicyClick = (index: number) => {
		setSelectedPolicyIndex(index);
	};

	const handleBackToGrid = () => {
		setSelectedPolicyIndex(null);
	};

	const handleIndexChange = (index: number) => {
		setSelectedPolicyIndex(index);
	};

	if (selectedPolicyIndex !== null) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={handleBackToGrid}
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Policies
					</Button>
					<p className="text-sm text-muted-foreground">
						Policy {selectedPolicyIndex + 1} of {policies.length}
					</p>
				</div>
				<PolicyCarousel
					policies={policies}
					user={user}
					initialIndex={selectedPolicyIndex}
					onIndexChange={handleIndexChange}
				/>
			</div>
		);
	}

	return (
		<PolicyGrid
			policies={policies}
			onPolicyClick={handlePolicyClick}
			user={user}
		/>
	);
}
