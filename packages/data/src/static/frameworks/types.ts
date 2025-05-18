/**
 * Represents a compliance or regulatory framework
 * that defines standards for security, privacy, or data handling.
 */
export interface Framework {
	/** Identifier of the framework */
	identifier: string;
	/** Name of the framework */
	name: string;
	/** Version number or year of the framework */
	version: string;
	/** Brief description of the framework's purpose and scope */
	description: string;
}

/**
 * Collection of supported compliance frameworks within the system.
 */
export interface Frameworks {
	/** SOC 2 (Service Organization Control 2) framework */
	"frk_682734f304cbbfdb3a9d4f44": Framework;
	/** ISO 27001 Information Security Management framework */
	// iso27001: Framework;
	/** General Data Protection Regulation framework */
	// gdpr: Framework;
}

/**
 * Valid framework ID strings that can be used to reference specific frameworks.
 */
export type FrameworkId = keyof Frameworks;
