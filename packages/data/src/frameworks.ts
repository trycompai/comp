export interface Framework {
	name: string;
	version: string;
	description: string;
}

export interface Frameworks {
	soc2: Framework;
	iso27001: Framework;
	gdpr: Framework;
}

export const frameworks: Frameworks = {
	soc2: {
		name: "SOC 2",
		version: "2025",
		description:
			"SOC 2 is a framework for assessing the security and reliability of information systems.",
	},
	iso27001: {
		name: "ISO 27001",
		version: "2025",
		description:
			"ISO 27001 is a framework for assessing the security and reliability of information systems.",
	},
	gdpr: {
		name: "GDPR",
		version: "2025",
		description:
			"GDPR is a framework for assessing the security and reliability of information systems.",
	},
};

// Add default export for easier importing
export default frameworks;
