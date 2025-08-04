import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import {
  CommentEntityType,
  db,
  Departments,
  Impact,
  Likelihood,
  RiskCategory,
  RiskTreatmentType,
  VendorCategory,
} from '@db';
import { logger, tasks } from '@trigger.dev/sdk/v3';
import { generateObject, generateText } from 'ai';
import axios from 'axios';
import z from 'zod';
import type { researchVendor } from '../scrape/research';
import { VENDOR_RISK_ASSESSMENT_PROMPT } from './prompts/vendor-risk-assessment';
import { updatePolicies } from './update-policies';

// Types
export type ContextItem = {
  question: string;
  answer: string;
};

export type PolicyContext = {
  name: string;
  description: string | null;
};

export type VendorData = {
  vendor_name: string;
  vendor_website: string;
  vendor_description: string;
  category: VendorCategory;
  inherent_probability: Likelihood;
  inherent_impact: Impact;
  residual_probability: Likelihood;
  residual_impact: Impact;
};

export type RiskData = {
  risk_name: string;
  risk_description: string;
  risk_treatment_strategy: RiskTreatmentType;
  risk_treatment_strategy_description: string;
  risk_residual_probability: Likelihood;
  risk_residual_impact: Impact;
  category: RiskCategory;
  department: Departments;
};

/**
 * Revalidates the organization path for cache busting
 */
export async function revalidateOrganizationPath(organizationId: string): Promise<void> {
  try {
    logger.info(`Revalidating path ${process.env.BETTER_AUTH_URL}/${organizationId}`);
    const revalidateResponse = await axios.post(
      `${process.env.BETTER_AUTH_URL}/api/revalidate/path`,
      {
        path: `${process.env.BETTER_AUTH_URL}/${organizationId}`,
        secret: process.env.REVALIDATION_SECRET,
        type: 'layout',
      },
    );

    if (!revalidateResponse.data?.revalidated) {
      logger.error(`Failed to revalidate path: ${revalidateResponse.statusText}`);
      logger.error(revalidateResponse.data);
    } else {
      logger.info('Revalidated path successfully');
    }
  } catch (err) {
    logger.error('Error revalidating path', { err });
  }
}

/**
 * Fetches organization data and context
 */
export async function getOrganizationContext(organizationId: string) {
  const [organization, contextHub, policies] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
    }),
    db.context.findMany({
      where: { organizationId },
    }),
    db.policy.findMany({
      where: { organizationId },
      select: { name: true, description: true },
    }),
  ]);

  if (!organization) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const questionsAndAnswers = contextHub.map((context) => ({
    question: context.question,
    answer: context.answer,
  }));

  return { organization, questionsAndAnswers, policies };
}

/**
 * Extracts vendors from context using AI
 */
export async function extractVendorsFromContext(
  questionsAndAnswers: ContextItem[],
): Promise<VendorData[]> {
  const result = await generateObject({
    model: openai('gpt-4.1-mini'),
    schema: z.object({
      vendors: z.array(
        z.object({
          vendor_name: z.string(),
          vendor_website: z.string(),
          vendor_description: z.string(),
          category: z.enum(Object.values(VendorCategory) as [string, ...string[]]),
          inherent_probability: z.enum(Object.values(Likelihood) as [string, ...string[]]),
          inherent_impact: z.enum(Object.values(Impact) as [string, ...string[]]),
          residual_probability: z.enum(Object.values(Likelihood) as [string, ...string[]]),
          residual_impact: z.enum(Object.values(Impact) as [string, ...string[]]),
        }),
      ),
    }),
    system:
      'Extract vendor names from the following questions and answers. Return their name (grammar-correct), website, description, category, inherent probability, inherent impact, residual probability, and residual impact.',
    prompt: questionsAndAnswers.map((q) => `${q.question}\n${q.answer}`).join('\n'),
  });

  return result.object.vendors as VendorData[];
}

/**
 * Creates a risk mitigation comment for a vendor
 */
export async function createVendorRiskComment(
  vendor: any,
  policies: PolicyContext[],
  organizationId: string,
  authorId: string,
): Promise<void> {
  const policiesContext =
    policies.length > 0
      ? policies
          .map((p) => `- ${p.name}: ${p.description || 'No description available'}`)
          .join('\n')
      : 'No specific policies available - use standard security policy guidance.';

  const riskMitigationComment = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: VENDOR_RISK_ASSESSMENT_PROMPT,
    prompt: `Vendor: ${vendor.name} (${vendor.category}) - ${vendor.description}. Website: ${vendor.website}.

Available Organization Policies:
${policiesContext}

Please perform a comprehensive vendor risk assessment for this vendor using the available policies listed above as context for your recommendations.`,
  });

  await db.comment.create({
    data: {
      content: riskMitigationComment.text,
      entityId: vendor.id,
      entityType: CommentEntityType.vendor,
      authorId,
      organizationId,
    },
  });

  logger.info(`Created risk mitigation comment for vendor: ${vendor.id} (${vendor.name})`);
}

/**
 * Processes and creates vendors with all related operations
 */
export async function processVendors(
  vendorData: VendorData[],
  organizationId: string,
  policies: PolicyContext[],
): Promise<void> {
  const commentAuthor = await db.member.findFirst({
    where: {
      organizationId,
      OR: [{ role: { contains: 'owner' } }, { role: { contains: 'admin' } }],
    },
    orderBy: [
      { role: 'desc' }, // Prefer owner over admin
      { createdAt: 'asc' }, // Prefer earlier members
    ],
  });

  for (const vendor of vendorData) {
    const existingVendor = await db.vendor.findMany({
      where: {
        organizationId,
        name: { contains: vendor.vendor_name },
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
        category: vendor.category,
        inherentProbability: vendor.inherent_probability,
        inherentImpact: vendor.inherent_impact,
        residualProbability: vendor.residual_probability,
        residualImpact: vendor.residual_impact,
        organizationId,
      },
    });

    // Trigger vendor research
    const handle = await tasks.trigger<typeof researchVendor>('research-vendor', {
      website: createdVendor.website ?? '',
    });

    // Create risk mitigation comment if we have a comment author
    if (commentAuthor) {
      await createVendorRiskComment(createdVendor, policies, organizationId, commentAuthor.id);
    }

    logger.info(
      `Created vendor: ${createdVendor.id} (${createdVendor.name}) with handle ${handle.id}`,
    );
  }
}

/**
 * Extracts risks from context using AI
 */
export async function extractRisksFromContext(
  questionsAndAnswers: ContextItem[],
  organizationName: string,
  existingRisks: { title: string }[],
): Promise<RiskData[]> {
  const result = await generateObject({
    model: openai('gpt-4.1-mini'),
    schema: z.object({
      risks: z.array(
        z.object({
          risk_name: z.string(),
          risk_description: z.string(),
          risk_treatment_strategy: z.enum(
            Object.values(RiskTreatmentType) as [string, ...string[]],
          ),
          risk_treatment_strategy_description: z.string(),
          risk_residual_probability: z.enum(Object.values(Likelihood) as [string, ...string[]]),
          risk_residual_impact: z.enum(Object.values(Impact) as [string, ...string[]]),
          category: z.enum(Object.values(RiskCategory) as [string, ...string[]]),
          department: z.enum(Object.values(Departments) as [string, ...string[]]),
        }),
      ),
    }),
    system: `Create a list of 8-12 risks that are relevant to the organization. Use action-oriented language, assume reviewers understand basic termilology - skip definitions.
          Your mandate is to propose risks that satisfy both ISO 27001:2022 clause 6.1 (risk management) and SOC 2 trust services criteria CC3 and CC4.
          Return the risk name, description, treatment strategy, treatment strategy description, residual probability, residual impact, category, and department.`,
    prompt: `
          The organization is ${organizationName}.

          Do not propose risks that are already in the database:
          ${existingRisks.map((r) => r.title).join('\n')}

          The questions and answers are:
          ${questionsAndAnswers.map((q) => `${q.question}\n${q.answer}`).join('\n')}
          `,
  });

  return result.object.risks as RiskData[];
}

/**
 * Processes and creates risks
 */
export async function processRisks(
  questionsAndAnswers: ContextItem[],
  organizationId: string,
  organizationName: string,
): Promise<void> {
  const existingRisks = await db.risk.findMany({
    where: { organizationId },
    select: { title: true, department: true },
  });

  const riskData = await extractRisksFromContext(
    questionsAndAnswers,
    organizationName,
    existingRisks,
  );

  for (const risk of riskData) {
    const createdRisk = await db.risk.create({
      data: {
        title: risk.risk_name,
        description: risk.risk_description,
        category: risk.category,
        department: risk.department,
        likelihood: risk.risk_residual_probability,
        impact: risk.risk_residual_impact,
        treatmentStrategy: risk.risk_treatment_strategy,
        treatmentStrategyDescription: risk.risk_treatment_strategy_description,
        organizationId,
      },
    });

    logger.info(`Created risk: ${createdRisk.id} (${createdRisk.title})`);
  }

  logger.info(`Created ${riskData.length} risks`);
}

/**
 * Processes policy updates
 */
export async function processPolicyUpdates(
  organizationId: string,
  questionsAndAnswers: ContextItem[],
): Promise<void> {
  const fullPolicies = await db.policy.findMany({
    where: { organizationId },
  });

  if (fullPolicies.length > 0) {
    await updatePolicies.batchTriggerAndWait(
      fullPolicies.map((policy) => ({
        payload: {
          organizationId,
          policyId: policy.id,
          contextHub: questionsAndAnswers.map((c) => `${c.question}\n${c.answer}`).join('\n'),
        },
        queue: {
          name: 'update-policies',
          concurrencyLimit: 5,
        },
        concurrencyKey: organizationId,
      })),
    );
  }
}
