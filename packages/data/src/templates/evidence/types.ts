import { Departments, Frequency } from "@bubba/db/types";

/**
 * Represents a piece of compliance or regulatory evidence
 * that organizations need to maintain and present during audits.
 */
export interface Evidence {
	/** Unique identifier for the evidence */
	id: string;
	/** Display name of the evidence */
	name: string;
	/** Detailed explanation of what this evidence entails */
	description: string;
	/** How often this evidence needs to be collected or updated (e.g., "monthly", "quarterly", "annually") */
	frequency: Frequency;
	/** The organizational department responsible for maintaining this evidence */
	department: Departments;
}

/**
 * A mapping of evidence IDs to their corresponding Evidence objects.
 * Used for efficient lookup of evidence by ID.
 */
export interface EvidenceMap {
	[key: string]: Evidence;
}
