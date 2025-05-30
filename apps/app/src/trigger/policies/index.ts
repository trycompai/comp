import {
	companyDetailslatestVersionSchema,
	companyDetailsObjectSchema,
} from "@/app/[locale]/(app)/(dashboard)/[orgId]/implementation/lib/models/CompanyDetails";
import { db } from "@comp/db";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { populatePolicyWithAI } from "./populate";

const companyDetailsSchema = z.object({
	companyDetails: companyDetailsObjectSchema,
	organizationId: z.string(),
});

export const populatePoliciesWithCompanyDetails = schemaTask({
	id: "populate-policies-with-company-details",
	schema: companyDetailsSchema,
	maxDuration: 1000 * 60 * 10,
	run: async ({ organizationId, companyDetails }) => {
		logger.info(
			`Running populate policies with company details for ${organizationId}`,
		);

		if (!companyDetails) {
			logger.error(
				`No company details found for organization ${organizationId}`,
			);
			return;
		}

		// Get policies
		const policies = await db.policy.findMany({
			where: {
				organizationId,
			},
			orderBy: {
				name: "asc",
			},
		});

		logger.info(`Found ${policies.length} policies for ${organizationId}`);

		const risks = await db.risk.findMany({
			where: {
				organizationId,
			},
		});

		const payloads = policies.map((policy) => ({
			payload: {
				organizationId,
				policyId: policy.id,
				companyDetails: companyDetails.data,
				risks,
			},
		}));

		const results =
			await populatePolicyWithAI.batchTriggerAndWait(payloads);

		logger.info(
			`Populated policies with company details for ${organizationId}`,
		);

		return {
			organizationId,
			policies,
			risks,
			companyDetails,
			results,
		};
	},
});
