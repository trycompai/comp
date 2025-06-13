import { openai } from "@ai-sdk/openai";
import { db } from "@comp/db";
import {
  Departments,
  Impact,
  Likelihood,
  RiskCategory,
  RiskTreatmentType,
  VendorCategory,
} from "@comp/db/types";
import { logger, task, tasks } from "@trigger.dev/sdk/v3";
import { generateObject } from "ai";
import axios from "axios";
import z from "zod";
import type { researchVendor } from "../scrape/research";
import { updatePolicies } from "./update-policies";

export const onboardOrganization = task({
  id: "onboard-organization",
  cleanup: async ({ organizationId }: { organizationId: string }) => {
    await db.onboarding.update({
      where: {
        organizationId,
      },
      data: { triggerJobId: null },
    });

    try {
      logger.info(
        `Revalidating path ${process.env.BETTER_AUTH_URL}/${organizationId}`
      );
      const revalidateResponse = await axios.post(
        `${process.env.BETTER_AUTH_URL}/api/revalidate/path`,
        {
          path: `${process.env.BETTER_AUTH_URL}/${organizationId}`,
          secret: process.env.REVALIDATION_SECRET,
          type: "layout",
        }
      );

      if (!revalidateResponse.data?.revalidated) {
        logger.error(
          `Failed to revalidate path: ${revalidateResponse.statusText}`
        );
        logger.error(revalidateResponse.data);
      } else {
        logger.info("Revalidated path successfully");
      }
    } catch (err) {
      logger.error("Error revalidating path", { err });
    }
  },
  run: async (payload: { organizationId: string }) => {
    logger.info(`Start onboarding organization ${payload.organizationId}`);

    const organization = await db.organization.findUnique({
      where: {
        id: payload.organizationId,
      },
    });

    if (!organization) {
      logger.error(`Organization ${payload.organizationId} not found`);
      return;
    }

    const contextHub = await db.context.findMany({
      where: {
        organizationId: payload.organizationId,
      },
    });

    const questionsAndAnswers = contextHub.map((context) => ({
      question: context.question,
      answer: context.answer,
    }));

    const extractVendors = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: z.object({
        vendors: z.array(
          z.object({
            vendor_name: z.string(),
            vendor_website: z.string(),
            vendor_description: z.string(),
            category: z.enum(
              Object.values(VendorCategory) as [string, ...string[]]
            ),
            inherent_probability: z.enum(
              Object.values(Likelihood) as [string, ...string[]]
            ),
            inherent_impact: z.enum(
              Object.values(Impact) as [string, ...string[]]
            ),
            residual_probability: z.enum(
              Object.values(Likelihood) as [string, ...string[]]
            ),
            residual_impact: z.enum(
              Object.values(Impact) as [string, ...string[]]
            ),
          })
        ),
      }),
      system:
        "Extract vendor names from the following questions and answers. Return their name (grammar-correct), website, description, category, inherent probability, inherent impact, residual probability, and residual impact.",
      prompt: questionsAndAnswers
        .map((q) => `${q.question}\n${q.answer}`)
        .join("\n"),
    });

    for (const vendor of extractVendors.object.vendors) {
      const existingVendor = await db.vendor.findMany({
        where: {
          organizationId: payload.organizationId,
          name: {
            contains: vendor.vendor_name,
          },
        },
      });

      if (existingVendor.length > 0) {
        logger.info(`Vendor ${vendor.vendor_name} already exists`);
        continue;
      }

      const createdVendor = await db.vendor.create({
        data: {
          name: vendor.vendor_name,
          website: vendor.vendor_website,
          description: vendor.vendor_description,
          category: vendor.category as VendorCategory,
          inherentProbability: vendor.inherent_probability as Likelihood,
          inherentImpact: vendor.inherent_impact as Impact,
          residualProbability: vendor.residual_probability as Likelihood,
          residualImpact: vendor.residual_impact as Impact,
          organizationId: payload.organizationId,
        },
      });

      const handle = await tasks.trigger<typeof researchVendor>(
        "research-vendor",
        {
          website: createdVendor.website ?? "",
        }
      );

      logger.info(
        `Created vendor: ${createdVendor.id} (${createdVendor.name}) with handle ${handle.id}`
      );
    }

    const existingRisks = await db.risk.findMany({
      where: {
        organizationId: payload.organizationId,
      },
      select: {
        title: true,
        department: true,
      },
    });

    const extractRisks = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: z.object({
        risks: z.array(
          z.object({
            risk_name: z.string(),
            risk_description: z.string(),
            risk_treatment_strategy: z.enum(
              Object.values(RiskTreatmentType) as [string, ...string[]]
            ),
            risk_treatment_strategy_description: z.string(),
            risk_residual_probability: z.enum(
              Object.values(Likelihood) as [string, ...string[]]
            ),
            risk_residual_impact: z.enum(
              Object.values(Impact) as [string, ...string[]]
            ),
            category: z.enum(
              Object.values(RiskCategory) as [string, ...string[]]
            ),
            department: z.enum(
              Object.values(Departments) as [string, ...string[]]
            ),
          })
        ),
      }),
      system: `Create a list of 8-12 risks that are relevant to the organization. Use action-oriented language, assume reviewers understand basic termilology - skip definitions.
            Your mandate is to propose risks that satisfy both ISO 27001:2022 clause 6.1 (risk management) and SOC 2 trust services criteria CC3 and CC4.
            Return the risk name, description, treatment strategy, treatment strategy description, residual probability, residual impact, category, and department.`,
      prompt: `
            The organization is ${organization.name}.

            Do not propose risks that are already in the database:
            ${existingRisks.map((r) => r.title).join("\n")}

            The questions and answers are:
            ${questionsAndAnswers
              .map((q) => `${q.question}\n${q.answer}`)
              .join("\n")}
            `,
    });

    for (const risk of extractRisks.object.risks) {
      const createdRisk = await db.risk.create({
        data: {
          title: risk.risk_name,
          description: risk.risk_description,
          category: risk.category as RiskCategory,
          department: risk.department as Departments | null,
          likelihood: risk.risk_residual_probability as Likelihood,
          impact: risk.risk_residual_impact as Impact,
          treatmentStrategy: risk.risk_treatment_strategy as RiskTreatmentType,
          treatmentStrategyDescription:
            risk.risk_treatment_strategy_description,
          organizationId: payload.organizationId,
        },
      });

      logger.info(`Created risk: ${createdRisk.id} (${createdRisk.title})`);
    }

    const policies = await db.policy.findMany({
      where: {
        organizationId: payload.organizationId,
      },
    });

    if (policies.length > 0) {
      await updatePolicies.batchTriggerAndWait(
        policies.map((policy) => ({
          payload: {
            organizationId: payload.organizationId,
            policyId: policy.id,
            contextHub: contextHub
              .map((c) => `${c.question}\n${c.answer}`)
              .join("\n"),
          },
          queue: {
            name: "update-policies",
            concurrencyLimit: 5,
          },
          concurrencyKey: payload.organizationId,
        }))
      );
    }

    await db.onboarding.update({
      where: {
        organizationId: payload.organizationId,
      },
      data: { completed: true },
    });

    logger.info(`Created ${extractRisks.object.risks.length} risks`);
    logger.info(`Created ${extractVendors.object.vendors.length} vendors`);
  },
});
