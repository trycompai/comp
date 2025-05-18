"use server";

import {
	Control,
	type Artifact,
	type Policy,
	type Task,
} from "@comp/db/types";
import { FrameworkInstanceWithComplianceScore } from "../components/types";
import { FrameworkInstanceWithControls } from "../types";

/**
 * Checks if a control is compliant based on its artifacts and tasks
 * @param artifacts - The artifacts to check
 * @param tasks - The tasks to check
 * @returns boolean indicating if all artifacts and tasks are compliant
 */
const isControlCompliant = (
	artifacts: (Artifact & {
		policy: Policy | null;
	})[],
	tasks: Task[],
) => {
	// If there are no artifacts, the control is not compliant
	if (!artifacts || artifacts.length === 0) {
		return false;
	}

	const totalArtifacts = artifacts.length;
	const completedArtifacts = artifacts.filter((artifact) => {
		if (!artifact) return false;

		switch (artifact.type) {
			case "policy":
				return artifact.policy?.status === "published";
			default:
				return false;
		}
	}).length;

	const totalTasks = tasks.length;
	const completedTasks = tasks.filter(
		(task) => task.status === "done",
	).length;

	return (
		completedArtifacts === totalArtifacts &&
		(totalTasks === 0 || completedTasks === totalTasks)
	);
};

/**
 * Gets all framework instances for an organization with compliance calculations
 * @param organizationId - The ID of the organization
 * @returns Array of frameworks with compliance percentages
 */
export async function getFrameworkWithComplianceScores({
	frameworksWithControls,
	tasks,
}: {
	frameworksWithControls: FrameworkInstanceWithControls[];
	tasks: (Task & { controls: Control[] })[];
}): Promise<FrameworkInstanceWithComplianceScore[]> {
	// Calculate compliance for each framework
	const frameworksWithComplianceScores = frameworksWithControls.map(
		(frameworkInstance) => {
			// Get all controls for this framework
			const controls = frameworkInstance.controls;

			// Calculate compliance percentage
			const totalControls = controls.length;
			const compliantControls = controls.filter((control) => {
				const controlTasks = tasks.filter((task) =>
					task.controls.some((c) => c.id === control.id),
				);
				return isControlCompliant(control.artifacts, controlTasks);
			}).length;

			const compliance =
				totalControls > 0
					? Math.round((compliantControls / totalControls) * 100)
					: 0;

			return {
				frameworkInstance,
				complianceScore: compliance,
			};
		},
	);

	return frameworksWithComplianceScores;
}
