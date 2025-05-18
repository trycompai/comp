import { Control, Task } from "@comp/db/types";
import { getFrameworkWithComplianceScores } from "../data/getFrameworkWithComplianceScores";
import type { FrameworkInstanceWithControls } from "../types";
import { FrameworkList } from "./FrameworkList";

export interface FrameworksOverviewProps {
	frameworksWithControls: FrameworkInstanceWithControls[];
	tasks: (Task & { controls: Control[] })[];
}

export async function FrameworksOverview({
	frameworksWithControls,
	tasks,
}: FrameworksOverviewProps) {
	const frameworksWithControlsAndComplianceScores =
		await getFrameworkWithComplianceScores({
			frameworksWithControls,
			tasks,
		});

	return (
		<div className="grid gap-4 md:grid-cols-1 select-none w-full">
			<FrameworkList
				frameworksWithControlsAndComplianceScores={
					frameworksWithControlsAndComplianceScores
				}
				tasks={tasks}
			/>
		</div>
	);
}
