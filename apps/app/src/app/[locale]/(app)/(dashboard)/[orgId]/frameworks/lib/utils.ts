import { StatusType } from "@/components/status-indicator";
// Import base types explicitly
import type { Artifact, Control, Policy, PolicyStatus } from "@comp/db/types";
import { Task } from "@comp/db/types";

// Define the expected artifact structure explicitly, allowing null status
type ArtifactWithRelations = Artifact & {
	policy: (Policy & { status: PolicyStatus | null }) | null;
};

// Function to determine control status based on artifacts
export function getControlStatus(
	artifacts: ArtifactWithRelations[], // Use the explicit type
	tasks: (Task & { controls: Control[] })[],
	controlId: string,
): StatusType {
	const controlTasks = tasks.filter((task) =>
		task.controls.some((c) => c.id === controlId),
	);

	// All artifacts are draft or none
	const allArtifactsDraft =
		!artifacts.length ||
		artifacts.every(
			(artifact) =>
				!artifact.policy || artifact.policy.status === "draft",
		);
	// All tasks are todo or none
	const allTasksTodo =
		!controlTasks.length ||
		controlTasks.every((task) => task.status === "todo");

	// All artifacts are published (or none) AND all tasks are done (or none)
	const allArtifactsPublished =
		artifacts.length > 0 &&
		artifacts.every(
			(artifact) =>
				artifact.policy && artifact.policy.status === "published",
		);
	const allTasksDone =
		controlTasks.length > 0 &&
		controlTasks.every((task) => task.status === "done");

	if (allArtifactsPublished && (controlTasks.length === 0 || allTasksDone))
		return "completed";
	if (allArtifactsDraft && allTasksTodo) return "not_started";
	return "in_progress";
}
