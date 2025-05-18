import { requirements } from "@comp/data";

export function getFrameworkRequirements(
	frameworkId: string,
) {
	return requirements[frameworkId as keyof typeof requirements] || [];
}
