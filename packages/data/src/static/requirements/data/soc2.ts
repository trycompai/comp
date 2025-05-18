import { SingleFrameworkRequirements } from "../types";
import { soc2RequirementIds } from "./soc2.types";

export const soc2Requirements: SingleFrameworkRequirements<soc2RequirementIds> =
	{
		"frk_rq_681e8514778fd2238a33c121": {
			identifier: "CC1",
			name: "CC1: Control Environment",
			description:
				"This criterion ensures that the organization demonstrates commitment to integrity and ethical values, establishes board oversight, creates appropriate organizational structures, and shows commitment to competence.",
		},
		"frk_rq_681e85140854c64019d53422": {
			identifier: "CC2",
			name: "CC2: Communication and Information",
			description:
				"This criterion focuses on how the organization obtains and uses relevant quality information to support the functioning of internal control, and communicates internal control information internally and externally.",
		},
		"frk_rq_681e8514f62bb35319068677": {
			identifier: "CC3",
			name: "CC3: Risk Assessment",
			description:
				"This criterion evaluates how the organization specifies suitable objectives, identifies and analyzes risk, and assesses fraud risk and significant change that could impact the system of internal control.",
		},
		"frk_rq_681e8514cba3ce1991f9d6c8": {
			identifier: "CC4",
			name: "CC4: Monitoring Activities",
			description:
				"This criterion assesses how the organization selects, develops and performs ongoing evaluations to determine whether controls are present and functioning, and communicates internal control deficiencies.",
		},
		"frk_rq_681e85140e8b698d7154d43e": {
			identifier: "CC5",
			name: "CC5: Control Activities",
			description:
				"This criterion evaluates how the organization selects and develops control activities that contribute to the mitigation of risks, and deploys them through policies and procedures.",
		},
		"frk_rq_681e8514753b4054f1a632e7": {
			identifier: "CC6",
			name: "CC6: Logical and Physical Access Controls",
			description:
				"This criterion focuses on how the organization implements controls over system boundaries, user identification and authentication, data security, and physical access to facilities and assets.",
		},
		"frk_rq_681e851403a5c3114dc746ba": {
			identifier: "CC7",
			name: "CC7: System Operations",
			description:
				"This criterion assesses how the organization manages system operations, detects and mitigates processing deviations, and implements recovery plans and business continuity procedures.",
		},
		"frk_rq_681e85146ed80156122dd094": {
			identifier: "CC8",
			name: "CC8: Change Management",
			description:
				"This criterion evaluates how the organization manages changes to infrastructure, data, software and procedures including change authorization and documentation.",
		},
		"frk_rq_681e8514fedb1b2123661713": {
			identifier: "CC9",
			name: "CC9: Risk Mitigation",
			description:
				"This criterion assesses how the organization identifies, selects and develops risk mitigation activities for risks arising from potential business disruptions and the use of vendors and business partners.",
		},
		"frk_rq_681e8514b7a9c5278ada8527": {
			identifier: "A1",
			name: "A1: Availability",
			description:
				"This criterion ensures that systems and data are available for operation and use as committed or agreed, including availability of information processing facilities and backup capabilities.",
		},
		"frk_rq_681e8514ae9bac0ace4829ae": {
			identifier: "C1",
			name: "C1: Confidentiality",
			description:
				"This criterion ensures that information designated as confidential is protected according to policy and procedures as committed or agreed, including encryption, access controls and secure disposal.",
		},
		"frk_rq_681e85145df1606ef144c69c": {
			identifier: "PI1",
			name: "PI1: Processing Integrity",
			description:
				"This criterion ensures that system processing is complete, valid, accurate, timely and authorized to meet the entity's objectives.",
		},
		"frk_rq_681e8514e2ebc08069c2c862": {
			identifier: "P1",
			name: "P1: Privacy",
			description:
				"This criterion ensures that personal information is collected, used, retained, disclosed and disposed of in conformity with commitments in the entity's privacy notice and criteria set forth in Generally Accepted Privacy Principles.",
		},
	} as const;
