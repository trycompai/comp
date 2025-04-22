export * from "./data/gdpr";
export * from "./data/gdpr.types";
export * from "./data/soc2";
export * from "./data/soc2.types";
export * from "./types";

import { gdprRequirements } from "./data/gdpr";
import { soc2Requirements } from "./data/soc2";
import { AllRequirements } from "./types";

export const requirements: AllRequirements = {
	soc2: soc2Requirements,
	gdpr: gdprRequirements,
	// iso27001: {},
	// gdpr: {},
} as const;
