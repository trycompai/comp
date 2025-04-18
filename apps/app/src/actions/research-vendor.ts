"use server";

import { env } from "@/env.mjs";
import { db } from "@comp/db";
import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
	company_name: z.string(),
	legal_name: z.string(),
	company_description: z.string(),
	company_hq_address: z.string(),
	privacy_policy_url: z.string(),
	terms_of_service_url: z.string(),
	service_level_agreement_url: z.string(),
	security_overview_url: z.string(),
	trust_portal_url: z.string(),
	certified_security_frameworks: z.array(z.string()),
	subprocessors: z.array(z.string()),
	type_of_company: z.string(),
});

export const researchVendorAction = authActionClient
	.schema(
		z.object({
			website: z.string().url({ message: "Invalid URL format" }),
		}),
	)
	.metadata({
		name: "research-vendor",
	})
	.action(async ({ parsedInput: { website }, ctx: { session } }) => {
		try {
			const { activeOrganizationId } = session;

			if (!activeOrganizationId) {
				return {
					success: false,
					error: "Not authorized",
				};
			}

			const firecrawl = new FirecrawlApp({
				apiKey: env.FIRECRAWL_API_KEY,
			});

			if (!firecrawl) {
				return {
					success: false,
					error: { message: "Firecrawl client not initialized" },
				};
			}

			const existingVendor = await db.globalVendors.findUnique({
				where: {
					website: website,
				},
				select: { website: true },
			});

			if (existingVendor) {
				return {
					success: true,
					data: {
						message: "Vendor already exists.",
						vendorExists: true,
					},
				};
			}

			console.log(`Attempting to scrape website: ${website}`);

			const scrapeResult = await firecrawl.extract([website], {
				prompt: "You're a cyber security researcher, researching a vendor.",
				schema: schema,
				enableWebSearch: true,
				scrapeOptions: {
					onlyMainContent: true,
					removeBase64Images: true,
				},
			});

			if (!scrapeResult.success || !scrapeResult.data) {
				console.error(
					"Firecrawl scrape failed:",
					scrapeResult.error || "Unknown error",
				);
				return {
					success: false,
					error: {
						message: `Failed to scrape vendor data: ${
							scrapeResult.error || "Unknown error"
						}`,
					},
				};
			}

			const vendorData = scrapeResult.data as z.infer<typeof schema>;

			await db.globalVendors.create({
				data: {
					website: website,
					company_name: vendorData.company_name,
					legal_name: vendorData.legal_name,
					company_description: vendorData.company_description,
					company_hq_address: vendorData.company_hq_address,
					privacy_policy_url: vendorData.privacy_policy_url,
					terms_of_service_url: vendorData.terms_of_service_url,
					service_level_agreement_url:
						vendorData.service_level_agreement_url,
					security_page_url: vendorData.security_overview_url,
					trust_page_url: vendorData.trust_portal_url,
					security_certifications:
						vendorData.certified_security_frameworks,
					subprocessors: vendorData.subprocessors,
					type_of_company: vendorData.type_of_company,
				},
			});

			return {
				success: true,
				data: {
					message: "Vendor researched and added successfully.",
					vendorExists: false,
				},
			};
		} catch (error) {
			console.error("Error in researchVendorAction:", error);

			return {
				success: false,
				error: {
					message:
						error instanceof Error
							? error.message
							: "An unexpected error occurred.",
				},
			};
		}
	});
