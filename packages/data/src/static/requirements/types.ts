import { FrameworkId } from "../frameworks/types";
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
	/** Identifier of the requirement */
	identifier: string;
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
	"frk_682734f304cbbfdb3a9d4f44": soc2RequirementIds;
};
