"use client";

import { Control, Task } from "@comp/db/types";
import { FrameworkCard } from "./FrameworkCard";
import type { FrameworkInstanceWithComplianceScore } from "./types";

export function FrameworkList({
	frameworksWithControlsAndComplianceScores,
	tasks,
}: {
	frameworksWithControlsAndComplianceScores: FrameworkInstanceWithComplianceScore[];
	tasks: (Task & { controls: Control[] })[];
}) {
	if (!frameworksWithControlsAndComplianceScores.length) return null;

	return (
		<div className="space-y-6">
			{frameworksWithControlsAndComplianceScores.map(
				({ frameworkInstance, complianceScore }) => (
					<FrameworkCard
						key={frameworkInstance.id}
						frameworkInstance={frameworkInstance}
						complianceScore={complianceScore}
						tasks={tasks}
					/>
				),
			)}
		</div>
	);
}
