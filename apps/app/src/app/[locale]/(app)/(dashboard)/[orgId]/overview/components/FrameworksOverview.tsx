import { getComplianceScores } from "../data/getComplianceScores";
import { getFrameworkWithComplianceScores } from "../data/getFrameworkWithComplianceScores";
import type { FrameworkInstanceWithControls } from "../types";
import { FrameworkList } from "./FrameworkList";

export interface FrameworksOverviewProps {
	organizationId: string;
	frameworksWithControls: FrameworkInstanceWithControls[];
}

export async function FrameworksOverview({
	organizationId,
	frameworksWithControls,
}: FrameworksOverviewProps) {
	const complianceScores = await getComplianceScores({
		organizationId,
		frameworksWithControls,
	});

	const frameworksWithComplianceScores = await getFrameworkWithComplianceScores(
		{
			frameworksWithControls,
		},
	);

	return (
		<div className="space-y-12">
			<div className="grid gap-4 md:grid-cols-2 select-none">
				{/* <FrameworkProgress complianceScores={complianceScores} /> */}
				<FrameworkList
					frameworksWithComplianceScores={frameworksWithComplianceScores}
				/>
			</div>
		</div>
	);
}
