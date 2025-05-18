export * from "./data/soc2";

import { soc2Requirements } from "./data/soc2";
import { AllRequirements } from "./types";

export const requirements: AllRequirements = {
	"frk_682734f304cbbfdb3a9d4f44": soc2Requirements,
	// iso27001: {},
	// gdpr: {},
} as const;
