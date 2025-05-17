import { FrameworkId } from "../../static/frameworks/types";
import { AllRequirementIdsByFramework } from "../../static/requirements/types";
import { TemplateTaskId } from "../tasks";
import { TemplatePolicyId } from "../policies";

/**
 * Represents an artifact associated with a control
 * that can be used to demonstrate compliance.
 */
export type TemplateArtifact = {
	type: "policy";
	policyId: TemplatePolicyId;
};

/**
 * Represents a requirement that a control addresses.
 */
export type TemplateRequirement = {
	frameworkId: string;
	requirementId: string;
};

/**
 * Represents a security or compliance control that organizations
 * implement to address specific requirements.
 */
export interface TemplateControl {
	/** Unique identifier for the control */
	id: string;
	/** Display name of the control */
	name: string;
	/** Detailed explanation of what this control entails */
	description: string;
	/** List of artifacts used to demonstrate implementation of this control */
	mappedArtifacts: TemplateArtifact[];
	/** List of requirements this control addresses */
	mappedRequirements: TemplateRequirement[];
	/** List of tasks this control addresses */
	mappedTasks: { taskId: TemplateTaskId }[];
}
