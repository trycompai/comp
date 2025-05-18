import { frameworks } from "@comp/data";

export function getFrameworkDetails(frameworkId: string) {
	console.log("frameworkId", frameworkId);

	const framework = frameworks[frameworkId as keyof typeof frameworks];
	console.log("framework", framework);

	return framework;
}
