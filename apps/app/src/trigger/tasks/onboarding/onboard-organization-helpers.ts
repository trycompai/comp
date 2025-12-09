import { openai } from '@ai-sdk/openai';
import {
  CommentEntityType,
  db,
  Departments,
  FrameworkEditorFramework,
  Impact,
  Likelihood,
  Risk,
  RiskCategory,
  RiskStatus,
  RiskTreatmentType,
  VendorCategory,
} from '@db';
import { logger, metadata, tasks } from '@trigger.dev/sdk';
import { generateObject, generateText, jsonSchema } from 'ai';
import axios from 'axios';
import type { researchVendor } from '../scrape/research';
import { RISK_MITIGATION_PROMPT } from './prompts/risk-mitigation';
import { VENDOR_RISK_ASSESSMENT_PROMPT } from './prompts/vendor-risk-assessment';
import { updatePolicy } from './update-policy';

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

type OrganizationRecord = NonNullable<Awaited<ReturnType<typeof db.organization.findUnique>>>;

type OrganizationContextResult = {
  organization: OrganizationRecord;
  questionsAndAnswers: ContextItem[];
  policies: { id: string; name: string; description: string | null }[];
};

// Baseline risks that must always exist for every organization regardless of frameworks
const BASELINE_RISKS: Array<{
  title: string;
  description: string;
  category: RiskCategory;
  department: Departments;
  status: RiskStatus;
}> = [
  {
    title: 'Intentional Fraud and Misuse',
    description:
      'Intentional misrepresentation or deception by an internal actor (employee, contractor) or by the organization as a whole, for the purpose of achieving an unauthorized or improper gain.',
    category: RiskCategory.governance,
    department: Departments.gov,
    status: RiskStatus.closed,
  },
];

/**
 * Ensures baseline risks are present for the organization.
 * Creates them if missing. Returns the list of risks that were created.
 */
export async function ensureBaselineRisks(organizationId: string): Promise<Risk[]> {
  const created: Risk[] = [];

  for (const base of BASELINE_RISKS) {
    const existing = await db.risk.findFirst({
      where: {
        organizationId,
        title: base.title,
      },
    });

    if (!existing) {
      const risk = await db.risk.create({
        data: {
          title: base.title,
          description: base.description,
          category: base.category,
          department: base.department,
          status: base.status,
          organizationId,
        },
      });
      created.push(risk);
      logger.info(`Created baseline risk: ${risk.id} (${risk.title})`);
    }
  }

  return created;
}

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
export async function getOrganizationContext(
  organizationId: string,
): Promise<OrganizationContextResult> {
  const [organization, contextHub, policies] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
    }),
    db.context.findMany({
      where: { organizationId },
    }),
    db.policy.findMany({
      where: { organizationId },
      select: { id: true, name: true, description: true },
    }),
  ]);

  if (!organization) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const questionsAndAnswers = contextHub.map((context) => ({
    question: context.question,
    answer: context.answer,
  }));

  const typedPolicies = policies as Array<{
    id: string;
    name: string;
    description: string | null;
  }>;

  return { organization, questionsAndAnswers, policies: typedPolicies };
}

/**
 * Extracts vendors from context using AI
 */
export async function extractVendorsFromContext(
  questionsAndAnswers: ContextItem[],
): Promise<VendorData[]> {
  const { object } = await generateObject({
    model: openai('gpt-4.1-mini'),
    schema: jsonSchema({
      type: 'object',
      properties: {
        vendors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              vendor_name: { type: 'string' },
              vendor_website: { type: 'string' },
              vendor_description: { type: 'string' },
              category: { type: 'string', enum: Object.values(VendorCategory) },
              inherent_probability: { type: 'string', enum: Object.values(Likelihood) },
              inherent_impact: { type: 'string', enum: Object.values(Impact) },
              residual_probability: { type: 'string', enum: Object.values(Likelihood) },
              residual_impact: { type: 'string', enum: Object.values(Impact) },
            },
            required: [
              'vendor_name',
              'vendor_website',
              'vendor_description',
              'category',
              'inherent_probability',
              'inherent_impact',
              'residual_probability',
              'residual_impact',
            ],
          },
        },
      },
      required: ['vendors'],
    }),
    system:
      'Extract vendor names from the following questions and answers. Return their name (grammar-correct), website, description, category, inherent probability, inherent impact, residual probability, and residual impact.',
    prompt: questionsAndAnswers.map((q) => `${q.question}\n${q.answer}`).join('\n'),
  });

  return (object as { vendors: VendorData[] }).vendors;
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
    model: openai('gpt-5-mini'),
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
 * Finds a comment author (owner or admin) for the organization
 */
export async function findCommentAuthor(organizationId: string) {
  return await db.member.findFirst({
    where: {
      organizationId,
      OR: [{ role: { contains: 'owner' } }, { role: { contains: 'admin' } }],
      deactivated: false,
    },
    orderBy: [
      { role: 'desc' }, // Prefer owner over admin
      { createdAt: 'asc' }, // Prefer earlier members
    ],
  });
}

/**
 * Creates vendors from extracted data
 */
export async function createVendorsFromData(
  vendorData: VendorData[],
  organizationId: string,
): Promise<any[]> {
  // Mark all vendors as processing before creation
  vendorData.forEach((_, index) => {
    metadata.set(`vendor_temp_${index}_status`, 'processing');
  });

  // Check for existing vendors and create new ones concurrently
  const vendorPromises = vendorData.map(async (vendor, index) => {
    const existingVendor = await db.vendor.findMany({
      where: {
        organizationId,
        name: { contains: vendor.vendor_name },
      },
    });

    if (existingVendor.length > 0) {
      logger.info(`Vendor ${vendor.vendor_name} already exists`);
      // Mark as completed if it already exists
      const existing = existingVendor[0];
      metadata.set(`vendor_${existing.id}_status`, 'completed');
      return existing;
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

    logger.info(`Created vendor: ${createdVendor.id} (${createdVendor.name})`);
    return createdVendor;
  });

  const createdVendors = await Promise.all(vendorPromises);

  // Update metadata with all real IDs and mark as created (will be marked as assessing after all are created)
  createdVendors.forEach((vendor) => {
    const status = metadata.get(`vendor_${vendor.id}_status`);
    if (status === 'completed') {
      // Already marked as completed (existing vendor)
      return;
    }
    // New vendor, mark as created
    metadata.set(`vendor_${vendor.id}_status`, 'created');
  });

  // Note: vendorsCompleted is incremented when mitigation is generated, not when created

  return createdVendors;
}

/**
 * Triggers research tasks for created vendors
 */
export async function triggerVendorResearch(vendors: any[]): Promise<void> {
  for (const vendor of vendors) {
    const handle = await tasks.trigger<typeof researchVendor>('research-vendor', {
      website: vendor.website ?? '',
    });
    logger.info(`Triggered research for vendor ${vendor.name} with handle ${handle.id}`);
  }
}

/**
 * Creates risk mitigation comments for all vendors
 */
export async function createVendorRiskComments(
  vendors: any[],
  policies: PolicyContext[],
  organizationId: string,
  authorId: string,
): Promise<void> {
  for (const vendor of vendors) {
    await createVendorRiskComment(vendor, policies, organizationId, authorId);
  }
}

/**
 * Creates a risk mitigation comment for a risk
 */
export async function createRiskMitigationComment(
  risk: Risk,
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

  const mitigation = await generateText({
    model: openai('gpt-5-mini'),
    system: RISK_MITIGATION_PROMPT,
    prompt: `Risk: ${risk.title} (${risk.category} / ${risk.department})\n\nDescription:\n${risk.description}\n\nTreatment Strategy:\n${risk.treatmentStrategy}: ${risk.treatmentStrategyDescription || 'N/A'}\n\nResidual Assessment: Likelihood ${risk.likelihood}, Impact ${risk.impact}\n\nAvailable Organization Policies:\n${policiesContext}\n\nWrite a pragmatic mitigation plan with concrete steps the team can implement in the next 30-90 days.`,
  });

  await db.comment.create({
    data: {
      content: mitigation.text,
      entityId: risk.id,
      entityType: CommentEntityType.risk,
      authorId,
      organizationId,
    },
  });

  logger.info(`Created risk mitigation comment for risk: ${risk.id} (${risk.title})`);
}

/**
 * Creates risk mitigation comments for all risks provided
 */
export async function createRiskMitigationComments(
  risks: Risk[],
  policies: PolicyContext[],
  organizationId: string,
  authorId: string,
): Promise<void> {
  for (const risk of risks) {
    await createRiskMitigationComment(risk, policies, organizationId, authorId);
  }
}

/**
 * Create risk mitigation comments for risks
 */
export async function createRiskMitigation(
  risks: Risk[],
  policies: PolicyContext[],
  organizationId: string,
): Promise<void> {
  const commentAuthor = await findCommentAuthor(organizationId);

  if (commentAuthor && risks.length > 0) {
    await createRiskMitigationComments(risks, policies, organizationId, commentAuthor.id);
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
  const { object } = await generateObject({
    model: openai('gpt-4.1-mini'),
    schema: jsonSchema({
      type: 'object',
      properties: {
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              risk_name: { type: 'string' },
              risk_description: { type: 'string' },
              risk_treatment_strategy: { type: 'string', enum: Object.values(RiskTreatmentType) },
              risk_treatment_strategy_description: { type: 'string' },
              risk_residual_probability: { type: 'string', enum: Object.values(Likelihood) },
              risk_residual_impact: { type: 'string', enum: Object.values(Impact) },
              category: { type: 'string', enum: Object.values(RiskCategory) },
              department: { type: 'string', enum: Object.values(Departments) },
            },
            required: [
              'risk_name',
              'risk_description',
              'risk_treatment_strategy',
              'risk_treatment_strategy_description',
              'risk_residual_probability',
              'risk_residual_impact',
              'category',
              'department',
            ],
          },
        },
      },
      required: ['risks'],
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

  return (object as { risks: RiskData[] }).risks;
}

/**
 * Gets existing risks to avoid duplicates
 */
export async function getExistingRisks(organizationId: string) {
  return await db.risk.findMany({
    where: { organizationId },
    select: { title: true, department: true },
  });
}

/**
 * Creates risks from extracted data (AI-generated risks only)
 */
export async function createRisksFromData(
  riskData: RiskData[],
  organizationId: string,
): Promise<Risk[]> {
  // Mark all risks as processing before creation
  riskData.forEach((_, index) => {
    metadata.set(`risk_temp_${index}_status`, 'processing');
  });

  // Create all risks concurrently
  const createPromises = riskData.map((risk) =>
    db.risk.create({
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
    }),
  );

  const createdRisks = await Promise.all(createPromises);

  // Update metadata with all real IDs and mark as created (will be marked as assessing after all are created)
  createdRisks.forEach((createdRisk) => {
    metadata.set(`risk_${createdRisk.id}_status`, 'created');
    logger.info(`Created risk: ${createdRisk.id} (${createdRisk.title})`);
  });

  // Note: risksCompleted is incremented when mitigation is generated, not when created

  logger.info(`Created ${riskData.length} risks`);
  return createdRisks;
}

/**
 * Creates risks from combined baseline and AI-generated data
 */
async function createRisksFromDataWithBaseline(
  allRisksToCreate: Array<{
    isBaseline: boolean;
    baselineData: (typeof BASELINE_RISKS)[0] | null;
    riskData: RiskData | null;
  }>,
  organizationId: string,
): Promise<Risk[]> {
  // Mark all risks as processing before creation
  allRisksToCreate.forEach((_, index) => {
    metadata.set(`risk_temp_${index}_status`, 'processing');
  });

  // Create all risks concurrently (baseline + AI-generated)
  const createPromises = allRisksToCreate.map((risk) => {
    if (risk.isBaseline && risk.baselineData) {
      return db.risk.create({
        data: {
          title: risk.baselineData.title,
          description: risk.baselineData.description,
          category: risk.baselineData.category,
          department: risk.baselineData.department,
          status: risk.baselineData.status,
          organizationId,
        },
      });
    } else if (risk.riskData) {
      return db.risk.create({
        data: {
          title: risk.riskData.risk_name,
          description: risk.riskData.risk_description,
          category: risk.riskData.category,
          department: risk.riskData.department,
          likelihood: risk.riskData.risk_residual_probability,
          impact: risk.riskData.risk_residual_impact,
          treatmentStrategy: risk.riskData.risk_treatment_strategy,
          treatmentStrategyDescription: risk.riskData.risk_treatment_strategy_description,
          organizationId,
        },
      });
    }
    throw new Error('Invalid risk data');
  });

  const createdRisks = await Promise.all(createPromises);

  // Update metadata with all real IDs and mark as created (will be marked as assessing after all are created)
  createdRisks.forEach((createdRisk) => {
    metadata.set(`risk_${createdRisk.id}_status`, 'created');
    logger.info(`Created risk: ${createdRisk.id} (${createdRisk.title})`);
  });

  // Note: risksCompleted is incremented when mitigation is generated, not when created

  logger.info(`Created ${allRisksToCreate.length} risks (including baseline)`);
  return createdRisks;
}

/**
 * Gets all policies for an organization
 */
export async function getOrganizationPolicies(organizationId: string) {
  return await db.policy.findMany({
    where: { organizationId },
  });
}

/**
 * Triggers policy update tasks
 */
export async function triggerPolicyUpdates(
  organizationId: string,
  questionsAndAnswers: ContextItem[],
  frameworks: FrameworkEditorFramework[],
): Promise<void> {
  const policies = await getOrganizationPolicies(organizationId);

  if (policies.length > 0) {
    // Initialize policy progress tracking in parent metadata
    metadata.set('policiesTotal', policies.length);
    metadata.set('policiesCompleted', 0);
    metadata.set('policiesRemaining', policies.length);
    // Store policy info for tracking individual policies
    metadata.set(
      'policiesInfo',
      policies.map((p) => ({ id: p.id, name: p.name })),
    );

    // Initialize individual policy statuses - all start as 'queued'
    // Each policy gets its own metadata key: policy_{id}_status
    policies.forEach((policy) => {
      metadata.set(`policy_${policy.id}_status`, 'queued');
    });

    await updatePolicy.batchTriggerAndWait(
      policies.map((policy) => ({
        payload: {
          organizationId,
          policyId: policy.id,
          contextHub: questionsAndAnswers.map((c) => `${c.question}\n${c.answer}`).join('\n'),
          frameworks,
        },
        concurrencyKey: organizationId,
      })),
    );
  }
}

// HIGH-LEVEL ORCHESTRATION FUNCTIONS

/**
 * Complete vendor creation workflow
 */
export async function createVendors(
  questionsAndAnswers: ContextItem[],
  organizationId: string,
  vendorData?: VendorData[],
): Promise<any[]> {
  // Extract vendors using AI if not provided
  const vendorsToCreate = vendorData || (await extractVendorsFromContext(questionsAndAnswers));

  // Create vendor records in database
  const createdVendors = await createVendorsFromData(vendorsToCreate, organizationId);

  // Trigger background research for each vendor
  await triggerVendorResearch(createdVendors);

  return createdVendors;
}

/**
 * Create risk mitigation comments for vendors
 */
export async function createVendorRiskMitigation(
  vendors: any[],
  policies: PolicyContext[],
  organizationId: string,
): Promise<void> {
  const commentAuthor = await findCommentAuthor(organizationId);

  if (commentAuthor && vendors.length > 0) {
    await createVendorRiskComments(vendors, policies, organizationId, commentAuthor.id);
  }
}

/**
 * Complete risk creation workflow
 */
export async function createRisks(
  questionsAndAnswers: ContextItem[],
  organizationId: string,
  organizationName: string,
): Promise<Risk[]> {
  // Check if baseline risks need to be created (but don't create them yet)
  const existingRisks = await getExistingRisks(organizationId);
  const baselineRisksToCreate = BASELINE_RISKS.filter(
    (base) => !existingRisks.some((r) => r.title === base.title),
  );

  // Extract risks using AI
  const riskData = await extractRisksFromContext(
    questionsAndAnswers,
    organizationName,
    existingRisks,
  );

  // Combine baseline risks and AI-generated risks for tracking
  const allRisksToCreate = [
    ...baselineRisksToCreate.map((base) => ({
      isBaseline: true,
      baselineData: base,
      riskData: null as RiskData | null,
    })),
    ...riskData.map((risk) => ({
      isBaseline: false,
      baselineData: null as (typeof BASELINE_RISKS)[0] | null,
      riskData: risk,
    })),
  ];

  // Track all risks immediately as "pending" before creation
  if (allRisksToCreate.length > 0) {
    metadata.set('risksTotal', allRisksToCreate.length);
    metadata.set('risksCompleted', 0);
    metadata.set('risksRemaining', allRisksToCreate.length);
    // Use temporary IDs based on index until we have real IDs
    metadata.set(
      'risksInfo',
      allRisksToCreate.map((r, index) => ({
        id: `temp_${index}`,
        name: r.isBaseline ? r.baselineData!.title : r.riskData!.risk_name,
      })),
    );
    // Mark all as pending initially
    allRisksToCreate.forEach((_, index) => {
      metadata.set(`risk_temp_${index}_status`, 'pending');
    });
  }

  // Create all risks together (baseline + AI-generated) in one batch
  const createdRisks = await createRisksFromDataWithBaseline(allRisksToCreate, organizationId);

  // Update tracking with real risk IDs
  if (createdRisks.length > 0) {
    metadata.set(
      'risksInfo',
      createdRisks.map((r) => ({ id: r.id, name: r.title })),
    );
  }

  return createdRisks;
}

/**
 * Update organization policies with context
 */
export async function updateOrganizationPolicies(
  organizationId: string,
  questionsAndAnswers: ContextItem[],
  frameworks: FrameworkEditorFramework[],
): Promise<void> {
  await triggerPolicyUpdates(organizationId, questionsAndAnswers, frameworks);
}
