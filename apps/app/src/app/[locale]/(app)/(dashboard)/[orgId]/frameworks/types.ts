import {
	Artifact,
	Control,
	FrameworkInstance,
	Policy,
	RequirementMap,
	FrameworkEditorFramework,
} from "@comp/db/types";

export type FrameworkInstanceWithControls = FrameworkInstance & {
	framework: FrameworkEditorFramework;
	controls: (Control & {
		artifacts: (Artifact & {
			policy: Policy | null;
		})[];
		requirementsMapped: RequirementMap[];
	})[];
};
