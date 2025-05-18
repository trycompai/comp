import { requirements } from "@comp/data";

export function getRequirementDetails(
	requirementId: string,
) {
	// @ts-expect-error
	return requirements[requirementId];
}
