import { TemplatePolicyId, TemplateTaskId } from "@comp/data";

export interface TemplateControlNew {
	id: string;
	name: string;
	description: string;
	mappedRequirements: {
		frameworkId: string;
		requirementId: string;
	}[];
	mappedArtifacts: {
		type: "policy";
		policyId: TemplatePolicyId;
	}[];
	mappedTasks: {
		taskId: TemplateTaskId;
	}[];
}