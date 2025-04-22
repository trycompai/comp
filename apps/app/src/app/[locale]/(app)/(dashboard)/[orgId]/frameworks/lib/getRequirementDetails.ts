import { requirements } from "@comp/data";
import type { FrameworkId, Requirement } from "@comp/data";

export function getRequirementDetails(
	frameworkId: FrameworkId,
	requirementId: string,
): Requirement | undefined {
	const frameworkRequirements = requirements[frameworkId];

	if (!frameworkRequirements) {
		return undefined;
	}

	const requirement =
		frameworkRequirements[
			requirementId as keyof typeof frameworkRequirements
		];

	return requirement;
}
