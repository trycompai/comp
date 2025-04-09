"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { performance } from "node:perf_hooks";
import { authActionClient } from "../safe-action";
import { organizationSchema } from "../schema";
import { createStripeCustomer } from "./lib/create-stripe-customer";
import {
	createControlArtifacts,
	createFrameworkInstance,
	createOrganizationEvidence,
	createOrganizationPolicies,
	getRelevantControls,
} from "./lib/utils";
import { headers } from "next/headers";

export const createOrganizationAction = authActionClient
	.schema(organizationSchema)
	.metadata({
		name: "create-organization",
		track: {
			event: "create-organization",
			channel: "server",
		},
	})
	.action(async ({ parsedInput, ctx }) => {
		const { name, frameworks } = parsedInput;
		const { id: userId, email } = ctx.user;

		const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
		const slug = `${name
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/[\s_-]+/g, "-")}-${randomSuffix}`;

		const timings = {
			getAuthSession: 0,
			createStripeCustomer: 0,
			updateOrganizationWithStripeId: 0,
			transaction: 0, // Timing for the whole transaction
			getRelevantControls: 0,
			createFrameworkInstances: 0,
			createPoliciesAndEvidenceParallel: 0,
			createControlArtifacts: 0,
			total: 0,
		};
		const totalStart = performance.now();
		let start = performance.now();

		try {
			timings.getAuthSession = (performance.now() - start) / 1000;

			// --- External API Call + Initial Org Update (Outside Transaction) ---
			start = performance.now();

			timings.updateOrganizationWithStripeId =
				(performance.now() - start) / 1000;

			// --- Main Creation Logic (Inside Transaction) ---
			const transactionStart = performance.now();
			const result = await db.$transaction(
				async (tx) => {
					// REVISIT: Consider if more granular error handling/logging is needed within the transaction

					const organization = await db.organization.create({
						data: {
							name,
							slug,
							members: {
								create: {
									userId,
									role: "owner",
								},
							},
						},
					});

					const organizationId = organization.id;

					start = performance.now();
					const relevantControls = getRelevantControls(frameworks);
					const getRelevantControlsTime = (performance.now() - start) / 1000;

					start = performance.now();
					// Pass the transaction client `tx` to the helper
					const organizationFrameworks = await Promise.all(
						frameworks.map(
							(frameworkId) =>
								createFrameworkInstance(organizationId, frameworkId, tx), // Pass tx
						),
					);
					const createFrameworkInstancesTime =
						(performance.now() - start) / 1000;

					// Run policy and evidence creation in parallel
					start = performance.now();
					// Pass the transaction client `tx` to the helpers
					const [policiesForFrameworks, evidenceForFrameworks] =
						await Promise.all([
							createOrganizationPolicies(
								organizationId,
								relevantControls,
								userId,
								tx,
							), // Pass tx
							createOrganizationEvidence(
								organizationId,
								relevantControls,
								userId,
								tx,
							), // Pass tx
						]);
					const createPoliciesAndEvidenceParallelTime =
						(performance.now() - start) / 1000;

					start = performance.now();
					// Pass the transaction client `tx` to the helper
					await createControlArtifacts(
						organizationId,
						organizationFrameworks.map((framework) => framework.id),
						relevantControls,
						policiesForFrameworks,
						evidenceForFrameworks,
						tx, // Pass tx
					);
					const createControlArtifactsTime = (performance.now() - start) / 1000;

					// Return timings calculated inside the transaction scope
					return {
						getRelevantControlsTime,
						createFrameworkInstancesTime,
						createPoliciesAndEvidenceParallelTime,
						createControlArtifactsTime,
						organizationFrameworks, // Need this for the final return value potentially
						organizationId,
					};
				},
				{
					maxWait: 15000,
					timeout: 40000,
				},
			);
			timings.transaction = (performance.now() - transactionStart) / 1000;

			// Assign timings from the transaction result
			timings.getRelevantControls = result.getRelevantControlsTime;
			timings.createFrameworkInstances = result.createFrameworkInstancesTime;
			timings.createPoliciesAndEvidenceParallel =
				result.createPoliciesAndEvidenceParallelTime;
			timings.createControlArtifacts = result.createControlArtifactsTime;

			timings.total = (performance.now() - totalStart) / 1000;
			console.log("createOrganizationAction timings (s):", timings);
			console.warn(
				"NOTE: Transactionality currently relies on global 'db' client within helpers. Refactor helpers to accept 'tx' for true atomicity.",
			);

			const stripeCustomerId = await createStripeCustomer({
				name,
				email: email,
				organizationId: result.organizationId,
			});
			timings.createStripeCustomer = (performance.now() - start) / 1000;
			await db.organization.update({
				where: { id: result.organizationId },
				data: { stripeCustomerId },
			});

			if (!stripeCustomerId) {
				throw new Error("Failed to create Stripe customer");
			}

			await auth.api.setActiveOrganization({
				headers: await headers(),
				body: {
					organizationId: result.organizationId,
				},
			});

			return {
				success: true,
				organizationId: result.organizationId,
			};
		} catch (error) {
			console.error("Error during organization creation/update:", error);
			timings.total = (performance.now() - totalStart) / 1000;
			console.log("createOrganizationAction timings on error (s):", timings);

			// More specific error handling could be added here
			throw new Error("Failed to create or update organization structure");
		}
	});
