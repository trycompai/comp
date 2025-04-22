import { FrameworkId } from "../frameworks/types";
import { gdprRequirementIds } from "./data/gdpr.types";
import { soc2RequirementIds } from "./data/soc2.types";

/**
 * Represents a specific requirement from a compliance framework
 * that an organization needs to fulfill.
 */
export interface Requirement {
	/** Name of the requirement */
	name: string;
	/** Detailed explanation of what this requirement entails */
	description: string;
}

/**
 * A mapping of requirement codes to their corresponding Requirement objects.
 * Used for efficient lookup of requirements.
 */
export type SingleFrameworkRequirements<A extends string = string> = Record<
	A,
	Requirement
>;

export type AllRequirements = {
	[K in FrameworkId]: SingleFrameworkRequirements<
		AllRequirementIdsByFramework[K]
	>;
};

export type AllRequirementIdsByFramework = {
	soc2: soc2RequirementIds;
	gdpr: gdprRequirementIds;
};
