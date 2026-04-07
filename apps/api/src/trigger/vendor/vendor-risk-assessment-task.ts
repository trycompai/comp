import {
  db,
  Impact,
  Likelihood,
  TaskItemPriority,
  TaskItemStatus,
  VendorStatus,
  type TaskItemEntityType,
} from '@db';
import { openai } from '@ai-sdk/openai';
import type { Prisma } from '@db';
import type { Task } from '@trigger.dev/sdk';
import { logger, metadata, queue, schemaTask, tags } from '@trigger.dev/sdk';
import { generateObject } from 'ai';
import { z } from 'zod';

import { resolveTaskCreatorAndAssignee } from './vendor-risk-assessment/assignee';
import { VENDOR_RISK_ASSESSMENT_TASK_ID } from './vendor-risk-assessment/constants';
import {
  buildRiskAssessmentDescription,
  mergeNewsIntoRiskAssessment,
} from './vendor-risk-assessment/description';
import { firecrawlResearchCore } from './vendor-risk-assessment/firecrawl-agent-core';
import { firecrawlResearchNews } from './vendor-risk-assessment/firecrawl-agent-news';
import type { ResearchMessage } from './vendor-risk-assessment/metadata-types';
import {
  buildFrameworkChecklist,
  getDefaultFrameworks,
} from './vendor-risk-assessment/frameworks';
import { vendorRiskAssessmentPayloadSchema } from './vendor-risk-assessment/schema';

const VERIFY_RISK_ASSESSMENT_TASK_TITLE = 'Verify risk assessment' as const;

type VendorRiskAssessmentResult = {
  success: true;
  vendorId: string;
  deduped: boolean;
  researched: boolean;
  skipped?: boolean;
  reason?: 'no_website' | 'invalid_website';
  riskAssessmentVersion: string | null;
  verifyTaskItemId?: string;
};

type VendorRiskAssessmentTaskInput = z.input<
  typeof vendorRiskAssessmentPayloadSchema
>;

function parseVersionNumber(version: string | null | undefined): number {
  if (!version || !version.startsWith('v')) return 0;
  const n = Number.parseInt(version.slice(1), 10);
  return Number.isFinite(n) ? n : 0;
}

function maxVersion(
  vendors: Array<{ riskAssessmentVersion: string | null | undefined }>,
): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const v of vendors) {
    const n = parseVersionNumber(v.riskAssessmentVersion);
    if (n > bestN) {
      bestN = n;
      best = v.riskAssessmentVersion ?? null;
    }
  }
  return best;
}

async function withAdvisoryLock<T>({
  lockKey,
  run,
}: {
  lockKey: string;
  run: () => Promise<T>;
}): Promise<T> {
  // We use a Postgres advisory lock keyed by website/domain to serialize
  // the final "version increment + write" step (short critical section).
  // If the DB isn't Postgres or the lock fails, we fall back to running without a lock.
  try {
    await db.$executeRaw`SELECT pg_advisory_lock(hashtext(${lockKey}))`;
    try {
      return await run();
    } finally {
      await db.$executeRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
    }
  } catch (error) {
    logger.warn('Advisory lock unavailable; proceeding without lock', {
      lockKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return await run();
  }
}

/**
 * Increments version number (v1 -> v2 -> v3, etc.)
 */
function incrementVersion(currentVersion: string | null | undefined): string {
  if (!currentVersion || !currentVersion.startsWith('v')) {
    return 'v1';
  }
  const versionNumber = parseInt(currentVersion.slice(1), 10);
  if (isNaN(versionNumber)) {
    return 'v1';
  }
  return `v${versionNumber + 1}`;
}

/**
 * Determines if research is needed.
 * If withResearch is true, always do research (task was triggered because research is needed).
 * Otherwise, check if data exists - if not, do research.
 */
function shouldDoResearch(
  globalVendor: {
    riskAssessmentData: unknown;
    riskAssessmentVersion: string | null;
  } | null,
  withResearch: boolean,
): boolean {
  // If withResearch is true, task was triggered because research is needed (we filter before triggering)
  if (withResearch) {
    return true;
  }

  // Fallback: do research if vendor doesn't exist in GlobalVendors or has no data
  // (This shouldn't happen if filtering works correctly, but kept as safety check)
  if (!globalVendor || !globalVendor.riskAssessmentData) {
    return true;
  }

  // Otherwise, skip research (use existing data)
  return false;
}

function isJsonInputValue(value: unknown): value is Prisma.InputJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonInputValue);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(
      isJsonInputValue,
    );
  }

  return false;
}

function parseRiskAssessmentJson(value: string): Prisma.InputJsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(
      `Failed to parse vendor risk assessment JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isJsonInputValue(parsed)) {
    throw new Error('Parsed vendor risk assessment is not valid JSON');
  }

  return parsed;
}

const riskLevelSchema = z
  .object({
    riskLevel: z.string().optional(),
  })
  .passthrough();

function extractRiskLevel(value: Prisma.InputJsonValue): string | null {
  const parsed = riskLevelSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.riskLevel ?? null;
}

/**
 * Risk level categories that map to database enums:
 * - critical → Likelihood.very_likely / Impact.severe (highest)
 * - high → Likelihood.likely / Impact.major
 * - medium → Likelihood.possible / Impact.moderate
 * - low → Likelihood.unlikely / Impact.minor
 * - very_low → Likelihood.very_unlikely / Impact.insignificant (lowest)
 */
type NormalizedRiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'very_low';

const normalizedRiskLevelSchema = z.object({
  riskLevel: z
    .enum(['critical', 'high', 'medium', 'low', 'very_low'])
    .describe(
      'The normalized risk level - must be exactly one of these values',
    ),
});

/**
 * Use AI to normalize any risk level string to one of our exact enum values.
 * Uses gpt-4o-mini (fast and cheap) with structured output to ensure valid values.
 */
async function normalizeRiskLevel(
  rawRiskLevel: string | null | undefined,
): Promise<NormalizedRiskLevel | null> {
  if (!rawRiskLevel?.trim()) {
    return null;
  }

  try {
    const result = await generateObject({
      model: openai('gpt-5.2'),
      schema: normalizedRiskLevelSchema,
      prompt: `Classify this vendor security risk level into exactly one of these 5 categories.

Risk level from assessment: "${rawRiskLevel}"

Categories (highest to lowest risk):
- critical: Highest risk (severe, extreme, very high, critical concerns)
- high: Significant risk (high, major issues)
- medium: Moderate risk (medium, moderate, average)
- low: Low risk (low, minimal, minor)
- very_low: Minimal risk (very low, negligible, none)

Rules:
- Return exactly one of: critical, high, medium, low, very_low
- If ambiguous (e.g., "Low to Moderate"), pick the HIGHER risk to be conservative`,
    });

    logger.info('Normalized risk level', {
      rawRiskLevel,
      normalizedRiskLevel: result.object.riskLevel,
    });

    return result.object.riskLevel;
  } catch (error) {
    logger.warn('Failed to normalize risk level, defaulting to medium', {
      rawRiskLevel,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'medium';
  }
}

function mapRiskLevelToLikelihood(
  normalizedLevel: NormalizedRiskLevel | null,
): Likelihood {
  switch (normalizedLevel) {
    case 'critical':
      return Likelihood.very_likely;
    case 'high':
      return Likelihood.likely;
    case 'medium':
      return Likelihood.possible;
    case 'low':
      return Likelihood.unlikely;
    case 'very_low':
      return Likelihood.very_unlikely;
    default:
      // Default to medium (safer than lowest)
      return Likelihood.possible;
  }
}

function mapRiskLevelToImpact(
  normalizedLevel: NormalizedRiskLevel | null,
): Impact {
  switch (normalizedLevel) {
    case 'critical':
      return Impact.severe;
    case 'high':
      return Impact.major;
    case 'medium':
      return Impact.moderate;
    case 'low':
      return Impact.minor;
    case 'very_low':
      return Impact.insignificant;
    default:
      // Default to medium (safer than lowest)
      return Impact.moderate;
  }
}

/**
 * Valid compliance badge types for trust portal
 */
type ComplianceBadgeType =
  | 'soc2'
  | 'iso27001'
  | 'iso42001'
  | 'gdpr'
  | 'hipaa'
  | 'pci_dss'
  | 'nen7510'
  | 'iso9001';

/**
 * Map certification type strings from risk assessment to our badge types
 */
function mapCertificationToBadgeType(
  certType: string,
): ComplianceBadgeType | null {
  const normalized = certType.toLowerCase().replace(/[^a-z0-9]/g, '');

  // SOC 2 (Type I or Type II)
  if (normalized.includes('soc2') || normalized.includes('soc 2')) {
    return 'soc2';
  }

  // ISO 27001
  if (normalized.includes('iso27001') || normalized.includes('27001')) {
    return 'iso27001';
  }

  // ISO 42001 (AI Management)
  if (normalized.includes('iso42001') || normalized.includes('42001')) {
    return 'iso42001';
  }

  // ISO 9001 (Quality Management)
  if (normalized.includes('iso9001') || normalized.includes('9001')) {
    return 'iso9001';
  }

  // GDPR
  if (normalized.includes('gdpr')) {
    return 'gdpr';
  }

  // HIPAA
  if (normalized.includes('hipaa')) {
    return 'hipaa';
  }

  // PCI DSS
  if (
    normalized.includes('pcidss') ||
    normalized.includes('pci') ||
    normalized.includes('paymentcard')
  ) {
    return 'pci_dss';
  }

  // NEN 7510 (Dutch healthcare)
  if (normalized.includes('nen7510') || normalized.includes('7510')) {
    return 'nen7510';
  }

  return null;
}

/**
 * Extract compliance badges from risk assessment data.
 * Passes through ALL verified certifications — known types get normalized
 * to a canonical slug, unknown types are kept as-is.
 */
function extractComplianceBadges(
  data: Prisma.InputJsonValue,
): Prisma.InputJsonValue | null {
  try {
    const parsed = data as {
      certifications?: Array<{ type: string; status: string }>;
    };

    if (!parsed?.certifications || !Array.isArray(parsed.certifications)) {
      return null;
    }

    const badges: Array<{ type: string; verified: boolean }> = [];
    const seenTypes = new Set<string>();

    for (const cert of parsed.certifications) {
      if (cert.status !== 'verified') {
        continue;
      }

      // Normalize known types to canonical slugs, keep unknown as-is
      const badgeType =
        mapCertificationToBadgeType(cert.type) ?? cert.type.trim();
      if (badgeType && !seenTypes.has(badgeType.toLowerCase())) {
        seenTypes.add(badgeType.toLowerCase());
        badges.push({ type: badgeType, verified: true });
      }
    }

    return badges.length > 0 ? badges : null;
  } catch {
    return null;
  }
}

/**
 * Generate logo URL using Google Favicon API
 */
function generateLogoUrl(website: string | null): string | null {
  if (!website) return null;

  try {
    const urlWithProtocol = website.startsWith('http')
      ? website
      : `https://${website}`;
    const parsed = new URL(urlWithProtocol);
    const domain = parsed.hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

/**
 * Extract domain from website URL for GlobalVendors lookup.
 * Removes www. prefix and returns just the domain (e.g., "example.com").
 */
function extractDomain(website: string | null | undefined): string | null {
  if (!website) return null;

  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    // Add protocol if missing to make URL parsing work
    const urlString = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(urlString);
    // Remove www. prefix and return just the domain
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function normalizeWebsite(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;

  // Require explicit protocol (do not silently force https)
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const port = url.port ? `:${url.port}` : '';
    // Canonical key ignores path/query/hash
    return `${protocol}//${hostname}${port}`;
  } catch {
    return null;
  }
}

export const vendorRiskAssessmentTask: Task<
  typeof VENDOR_RISK_ASSESSMENT_TASK_ID,
  VendorRiskAssessmentTaskInput,
  VendorRiskAssessmentResult
> = schemaTask({
  id: VENDOR_RISK_ASSESSMENT_TASK_ID,
  queue: queue({ name: 'vendor-risk-assessment', concurrencyLimit: 10 }),
  schema: vendorRiskAssessmentPayloadSchema,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  maxDuration: 1000 * 60 * 10,
  run: async (payload) => {
    await tags.add([`org:${payload.organizationId}`]);

    const vendor = await db.vendor.findFirst({
      where: {
        id: payload.vendorId,
        organizationId: payload.organizationId,
      },
      select: {
        id: true,
        website: true,
        status: true,
        logoUrl: true,
      },
    });

    if (!vendor) {
      throw new Error(
        `Vendor ${payload.vendorId} not found in org ${payload.organizationId}`,
      );
    }

    // Mark vendor as in-progress immediately so UI can show "generating" state
    // This happens at the start before any processing, so the UI updates right away
    if (vendor.status !== VendorStatus.in_progress) {
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.in_progress },
      });
    }

    if (!vendor.website) {
      logger.info('⏭️ SKIP (no website)', { vendor: payload.vendorName });
      // Mark vendor as assessed even without website (no risk assessment possible)
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: false,
        researched: false,
        skipped: true,
        reason: 'no_website',
        riskAssessmentVersion: null,
      };
    }

    const normalizedWebsite = normalizeWebsite(vendor.website);
    if (!normalizedWebsite) {
      logger.info('⏭️ SKIP (invalid website)', {
        vendor: payload.vendorName,
        website: vendor.website,
      });
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: false,
        researched: false,
        skipped: true,
        reason: 'invalid_website',
        riskAssessmentVersion: null,
      };
    }

    // Check GlobalVendors for existing risk assessment using domain-based lookup
    // Find ALL duplicates to update them all (not just the most recent)
    const domain = extractDomain(vendor.website);
    const globalVendors = domain
      ? await db.globalVendors.findMany({
          where: {
            website: {
              contains: domain,
            },
          },
          select: {
            website: true,
            riskAssessmentVersion: true,
            riskAssessmentUpdatedAt: true,
            riskAssessmentData: true,
          },
          orderBy: [{ riskAssessmentUpdatedAt: 'desc' }, { createdAt: 'desc' }],
        })
      : [];

    // Use the most recent one for reading/checking, but we'll update all duplicates
    const globalVendor = globalVendors[0] ?? null;

    // Determine if research is needed
    // If withResearch is true, task was triggered because research is needed (we filter before triggering)
    const needsResearch = shouldDoResearch(
      globalVendor,
      payload.withResearch ?? false,
    );

    if (needsResearch) {
      logger.info('🔍 DOING RESEARCH', {
        vendor: payload.vendorName,
        website: normalizedWebsite,
      });
    } else {
      // This shouldn't happen if filtering works correctly, but kept as safety
      logger.info('✅ SKIP RESEARCH (already has data)', {
        vendor: payload.vendorName,
        website: normalizedWebsite,
        version: globalVendor ? globalVendor.riskAssessmentVersion : null,
      });

      // Still ensure a "Verify risk assessment" task exists so humans can confirm accuracy,
      // even when we are reusing cached GlobalVendors data (no research performed).
      const { creatorMemberId, assigneeMemberId } =
        await resolveTaskCreatorAndAssignee({
          organizationId: payload.organizationId,
          createdByUserId: payload.createdByUserId ?? null,
        });

      const creatorMember = await db.member.findUnique({
        where: { id: creatorMemberId },
        select: { id: true, userId: true },
      });

      const existingVerifyTask = await db.taskItem.findFirst({
        where: {
          organizationId: payload.organizationId,
          entityType: 'vendor' as TaskItemEntityType,
          entityId: payload.vendorId,
          title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
        },
        select: { id: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      const isNewTask = !existingVerifyTask;
      const verifyTaskItemId =
        existingVerifyTask?.id ??
        (
          await db.taskItem.create({
            data: {
              title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
              description:
                'Review the latest Risk Assessment and confirm it is accurate.',
              status: TaskItemStatus.todo,
              priority: TaskItemPriority.high,
              entityId: payload.vendorId,
              entityType: 'vendor',
              organizationId: payload.organizationId,
              createdById: creatorMemberId,
              assigneeId: assigneeMemberId,
            },
            select: { id: true },
          })
        ).id;

      // If task already exists but is still blocked, flip it to todo (unless done/canceled).
      await db.taskItem.updateMany({
        where: {
          id: verifyTaskItemId,
          status: { notIn: [TaskItemStatus.done, TaskItemStatus.canceled] },
        },
        data: {
          status: TaskItemStatus.todo,
          description:
            'Review the latest Risk Assessment and confirm it is accurate.',
          assigneeId: assigneeMemberId,
          updatedById: creatorMemberId,
        },
      });

      // Audit log for automated task creation (best-effort)
      if (isNewTask && creatorMember?.userId) {
        try {
          await db.auditLog.create({
            data: {
              organizationId: payload.organizationId,
              userId: creatorMember.userId,
              memberId: creatorMember.id,
              entityType: 'task',
              entityId: verifyTaskItemId,
              description: 'created this task',
              data: {
                action: 'created',
                taskItemId: verifyTaskItemId,
                taskTitle: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
                parentEntityType: 'vendor',
                parentEntityId: payload.vendorId,
              },
            },
          });
        } catch (error) {
          logger.error('Failed to log task item creation:', error);
        }
      }

      // Extract compliance badges and logo from cached GlobalVendors data
      const cachedBadges = globalVendor?.riskAssessmentData
        ? extractComplianceBadges(
            globalVendor.riskAssessmentData as Prisma.InputJsonValue,
          )
        : null;
      const cachedLogoUrl = generateLogoUrl(vendor.website);

      // Still mark the org-specific vendor as assessed, and sync badges/logo
      await db.vendor.update({
        where: { id: vendor.id },
        data: {
          status: VendorStatus.assessed,
          ...(cachedBadges ? { complianceBadges: cachedBadges } : {}),
          ...(cachedLogoUrl && !vendor.logoUrl
            ? { logoUrl: cachedLogoUrl }
            : {}),
        },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: true,
        researched: false,
        riskAssessmentVersion: globalVendor?.riskAssessmentVersion ?? 'v1',
      };
    }

    // Note: status is already set to in_progress at the start of the task

    const { creatorMemberId, assigneeMemberId } =
      await resolveTaskCreatorAndAssignee({
        organizationId: payload.organizationId,
        createdByUserId: payload.createdByUserId ?? null,
      });

    // Get creator member with userId for activity log
    const creatorMember = await db.member.findUnique({
      where: { id: creatorMemberId },
      select: { id: true, userId: true },
    });

    if (!creatorMember?.userId) {
      logger.warn(
        'Creator member has no userId, skipping activity log creation',
        {
          creatorMemberId,
          organizationId: payload.organizationId,
        },
      );
    }

    // Ensure a "Verify risk assessment" task exists immediately, but keep it blocked while generation runs.
    // We represent "blocked" as status=in_progress to prevent the team from treating it as ready.
    const existingVerifyTask = await db.taskItem.findFirst({
      where: {
        organizationId: payload.organizationId,
        entityType: 'vendor' as TaskItemEntityType,
        entityId: payload.vendorId,
        title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
      },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const isNewTask = !existingVerifyTask;
    const verifyTaskItemId =
      existingVerifyTask?.id ??
      (
        await db.taskItem.create({
          data: {
            title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
            description: 'Waiting for risk assessment generation to complete.',
            status: TaskItemStatus.in_progress,
            priority: TaskItemPriority.high,
            entityId: payload.vendorId,
            entityType: 'vendor',
            organizationId: payload.organizationId,
            createdById: creatorMemberId,
            assigneeId: assigneeMemberId,
          },
          select: { id: true },
        })
      ).id;

    // Create activity log for new task creation
    if (isNewTask && creatorMember?.userId) {
      try {
        await db.auditLog.create({
          data: {
            organizationId: payload.organizationId,
            userId: creatorMember.userId,
            memberId: creatorMemberId,
            entityType: 'task',
            entityId: verifyTaskItemId,
            description: 'created this task',
            data: {
              action: 'created',
              taskItemId: verifyTaskItemId,
              taskTitle: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
              parentEntityType: 'vendor',
              parentEntityId: payload.vendorId,
            },
          },
        });
      } catch (error) {
        logger.error('Failed to log task item creation:', error);
        // Don't throw - audit log failures should not block operations
      }
    }

    // Focused frameworks
    const organizationFrameworks = getDefaultFrameworks();
    const frameworkChecklist = buildFrameworkChecklist(organizationFrameworks);

    try {
    // Helper to append a progress message to run metadata
    const messages: ResearchMessage[] = [];
    const pushMessage = (text: string, type: ResearchMessage['type'], url?: string) => {
      const msg: ResearchMessage = { text, type, timestamp: Date.now(), ...url ? { url } : {} };
      messages.push(msg);
      metadata.set('messages', messages);
    };

    // Initialize metadata
    metadata.set('phase', 'starting');
    metadata.set('messages', []);
    metadata.set('coreReady', false);
    metadata.set('newsReady', false);

    metadata.set('phase', 'researching');
    pushMessage(`Analyzing ${payload.vendorWebsite}...`, 'searching');

    logger.info('🚀 Starting parallel research', {
      vendor: payload.vendorName,
      website: payload.vendorWebsite,
      organizationId: payload.organizationId,
    });

    const coreStartedAt = Date.now();
    const newsStartedAt = Date.now();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    // Run core research and news research in parallel
    const [coreResult, newsResult] = await Promise.allSettled([
      (async () => {
        pushMessage('Crawling vendor website...', 'searching');
        logger.info('🔍 Core research started', {
          vendor: payload.vendorName,
          website: payload.vendorWebsite,
        });
        const result = await firecrawlResearchCore({
          vendorName: payload.vendorName,
          vendorWebsite: payload.vendorWebsite!,
        });
        const durationMs = Date.now() - coreStartedAt;
        if (result) {
          const certCount = result.certifications?.length ?? 0;
          const verifiedCount =
            result.certifications?.filter((c) => c.status === 'verified')
              .length ?? 0;
          const linkCount = result.links?.length ?? 0;
          logger.info('✅ Core research completed', {
            vendor: payload.vendorName,
            durationMs,
            certifications: certCount,
            verifiedCertifications: verifiedCount,
            links: linkCount,
            hasAssessment: Boolean(result.securityAssessment),
            riskLevel: result.riskLevel ?? 'none',
          });

          // Report each finding individually with delays so the UI
          // shows them appearing one by one in real time
          if (result.certifications?.length) {
            pushMessage('Extracting certifications...', 'analyzing');
            await sleep(300);
            for (const cert of result.certifications) {
              if (cert.status === 'verified') {
                pushMessage(`Found ${cert.type}`, 'found', cert.url ?? undefined);
                await sleep(250);
              }
            }
          }

          if (result.links?.length) {
            pushMessage('Extracting security and legal links...', 'analyzing');
            await sleep(300);
            for (const link of result.links) {
              pushMessage(`Found ${link.label}`, 'found', link.url);
              await sleep(200);
            }
          }

          if (result.securityAssessment) {
            pushMessage('Generating security assessment...', 'analyzing');
            await sleep(400);
            pushMessage('Security assessment complete', 'found');
          }
        } else {
          logger.warn('⚠️ Core research returned null', {
            vendor: payload.vendorName,
            durationMs,
          });
        }
        return result;
      })(),
      (async () => {
        logger.info('📰 News research started', {
          vendor: payload.vendorName,
          website: payload.vendorWebsite,
        });
        const result = await firecrawlResearchNews({
          vendorName: payload.vendorName,
          vendorWebsite: payload.vendorWebsite!,
        });
        const durationMs = Date.now() - newsStartedAt;
        if (result?.length) {
          logger.info('✅ News research completed', {
            vendor: payload.vendorName,
            durationMs,
            newsItems: result.length,
          });
          // Stagger news reporting
          pushMessage('Processing recent news...', 'analyzing');
          await sleep(200);
          for (const item of result) {
            pushMessage(`Found: ${item.title}`, 'found', item.url ?? undefined);
            await sleep(150);
          }
        } else {
          logger.info('📰 News research returned no items', {
            vendor: payload.vendorName,
            durationMs,
          });
        }
        return result;
      })(),
    ]);

    logger.info('🏁 Both research calls settled', {
      vendor: payload.vendorName,
      coreStatus: coreResult.status,
      newsStatus: newsResult.status,
      coreError:
        coreResult.status === 'rejected' ? String(coreResult.reason) : null,
      newsError:
        newsResult.status === 'rejected' ? String(newsResult.reason) : null,
    });

    // --- Process core results ---
    const coreData =
      coreResult.status === 'fulfilled' ? coreResult.value : null;

    if (coreData) {
      pushMessage('Writing core research to database...', 'analyzing');
      logger.info('💾 Writing core data to GlobalVendors', {
        vendor: payload.vendorName,
        domain,
        normalizedWebsite,
      });

      const description = buildRiskAssessmentDescription({
        vendorName: payload.vendorName,
        vendorWebsite: payload.vendorWebsite ?? null,
        research: { ...coreData, news: null },
        frameworkChecklist,
        organizationFrameworks,
      });
      const data = parseRiskAssessmentJson(description);

      // Upsert GlobalVendors (same advisory lock pattern as before)
      const lockKey = domain ?? normalizedWebsite;
      const { nextVersion, updatedWebsites } = await withAdvisoryLock({
        lockKey,
        run: async () => {
          const latestGlobalVendors = domain
            ? await db.globalVendors.findMany({
                where: { website: { contains: domain } },
                select: {
                  website: true,
                  riskAssessmentVersion: true,
                  riskAssessmentUpdatedAt: true,
                },
                orderBy: [
                  { riskAssessmentUpdatedAt: 'desc' },
                  { createdAt: 'desc' },
                ],
              })
            : [];

          const currentMax = maxVersion(latestGlobalVendors);
          const computedNext = incrementVersion(currentMax);
          const now = new Date();

          if (latestGlobalVendors.length > 0) {
            for (const gv of latestGlobalVendors) {
              await db.globalVendors.update({
                where: { website: gv.website },
                data: {
                  company_name: payload.vendorName,
                  riskAssessmentData: data,
                  riskAssessmentVersion: computedNext,
                  riskAssessmentUpdatedAt: now,
                },
              });
            }
            return {
              nextVersion: computedNext,
              updatedWebsites: latestGlobalVendors.map((gv) => gv.website),
            };
          }

          await db.globalVendors.upsert({
            where: { website: normalizedWebsite },
            create: {
              website: normalizedWebsite,
              company_name: payload.vendorName,
              riskAssessmentData: data,
              riskAssessmentVersion: computedNext,
              riskAssessmentUpdatedAt: now,
            },
            update: {
              company_name: payload.vendorName,
              riskAssessmentData: data,
              riskAssessmentVersion: computedNext,
              riskAssessmentUpdatedAt: now,
            },
          });

          return {
            nextVersion: computedNext,
            updatedWebsites: [normalizedWebsite],
          };
        },
      });

      logger.info('💾 GlobalVendors upsert complete', {
        vendor: payload.vendorName,
        version: nextVersion,
        updatedWebsites,
      });

      // Extract risk level and badges
      logger.info('🎯 Normalizing risk level', {
        vendor: payload.vendorName,
      });
      const rawRiskLevel = extractRiskLevel(data);
      const normalizedRiskLvl = await normalizeRiskLevel(rawRiskLevel);
      const inherentProbability = mapRiskLevelToLikelihood(normalizedRiskLvl);
      const inherentImpact = mapRiskLevelToImpact(normalizedRiskLvl);
      const residualProbability = mapRiskLevelToLikelihood(normalizedRiskLvl);
      const residualImpact = mapRiskLevelToImpact(normalizedRiskLvl);
      const complianceBadges = extractComplianceBadges(data);
      const logoUrl = generateLogoUrl(vendor.website);

      logger.info('📊 Risk level and badges extracted', {
        vendor: payload.vendorName,
        rawRiskLevel,
        normalizedRiskLevel: normalizedRiskLvl,
        hasBadges: Boolean(complianceBadges),
        badgeCount: Array.isArray(complianceBadges) ? complianceBadges.length : 0,
        hasLogo: Boolean(logoUrl),
      });

      // Update vendor with core data (keep status in_progress — news may still be loading)
      await db.vendor.update({
        where: { id: vendor.id },
        data: {
          inherentProbability,
          inherentImpact,
          residualProbability,
          residualImpact,
          ...(complianceBadges ? { complianceBadges } : {}),
          ...(logoUrl ? { logoUrl } : {}),
        },
      });

      metadata.set('phase', 'core_complete');
      metadata.set('coreReady', true);

      logger.info('🎉 Core phase complete — vendor updated, metadata.coreReady=true', {
        vendor: payload.vendorName,
        vendorId: vendor.id,
        version: nextVersion,
      });

      // --- Process news results (merge into existing data) ---
      const newsData =
        newsResult.status === 'fulfilled' ? newsResult.value : null;

      if (newsData && newsData.length > 0) {
        pushMessage('Adding news to research data...', 'analyzing');

        await withAdvisoryLock({
          lockKey,
          run: async () => {
            // Read current data, merge news, write back
            const websites =
              updatedWebsites.length > 0
                ? updatedWebsites
                : [normalizedWebsite];
            for (const website of websites) {
              const gv = await db.globalVendors.findUnique({
                where: { website },
                select: { riskAssessmentData: true },
              });
              if (!gv?.riskAssessmentData) continue;

              const existingParsed = gv.riskAssessmentData as Record<
                string,
                unknown
              >;
              const existingTyped =
                existingParsed as unknown as import('./vendor-risk-assessment/agent-types').VendorRiskAssessmentDataV1;
              const merged = mergeNewsIntoRiskAssessment(
                existingTyped,
                newsData,
              );

              await db.globalVendors.update({
                where: { website },
                data: {
                  riskAssessmentData: JSON.parse(JSON.stringify(merged)),
                },
              });
            }
          },
        });

        metadata.set('newsReady', true);
        logger.info('📰 News merged into GlobalVendors — metadata.newsReady=true', {
          vendor: payload.vendorName,
          vendorId: vendor.id,
          newsCount: newsData.length,
          websites: updatedWebsites.length > 0 ? updatedWebsites : [normalizedWebsite],
        });
      } else if (newsResult.status === 'rejected') {
        pushMessage('News research could not be completed', 'error');
        logger.warn('News research failed, continuing with core data only', {
          vendor: payload.vendorName,
          error:
            newsResult.reason instanceof Error
              ? newsResult.reason.message
              : String(newsResult.reason),
        });
      }
    } else {
      // Core research failed
      if (coreResult.status === 'rejected') {
        pushMessage('Research encountered an issue', 'error');
        metadata.set('phase', 'failed');
        throw coreResult.reason;
      }
      // Core returned null (API key missing, invalid URL, etc.)
      pushMessage('Could not complete research for this vendor', 'error');
      metadata.set('phase', 'failed');
      throw new Error(
        `Core research returned null for ${payload.vendorName} — vendor will not be marked as assessed`,
      );
    }

    // Mark vendor as assessed and flip verify task
    logger.info('🏷️ Setting vendor status to assessed', {
      vendor: payload.vendorName,
      vendorId: vendor.id,
    });
    await db.vendor.update({
      where: { id: vendor.id },
      data: { status: VendorStatus.assessed },
    });

    await db.taskItem.updateMany({
      where: {
        id: verifyTaskItemId,
        status: { notIn: [TaskItemStatus.done, TaskItemStatus.canceled] },
      },
      data: {
        status: TaskItemStatus.todo,
        description:
          'Review the latest Risk Assessment and confirm it is accurate.',
        assigneeId: assigneeMemberId,
        updatedById: creatorMemberId,
      },
    });

    metadata.set('phase', 'complete');

    logger.info('✅ COMPLETED — all phases done', {
      vendor: payload.vendorName,
      vendorId: vendor.id,
      researched: Boolean(coreData),
      hasNews: newsResult.status === 'fulfilled' && Boolean(newsResult.value),
      coreStatus: coreResult.status,
      newsStatus: newsResult.status,
    });

    return {
      success: true,
      vendorId: vendor.id,
      deduped: false,
      researched: Boolean(coreData),
      riskAssessmentVersion: coreData ? 'latest' : null,
      verifyTaskItemId,
    };
    } catch (error) {
      // Reset vendor status so the UI no longer shows an infinite loading state.
      // The user can retry later once the underlying issue is resolved.
      logger.error('❌ Risk assessment failed, resetting vendor status', {
        vendor: payload.vendorName,
        vendorId: vendor.id,
        error: error instanceof Error ? error.message : String(error),
      });

      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });

      // Also reset the verify task back to todo so it doesn't stay stuck
      if (typeof verifyTaskItemId === 'string') {
        await db.taskItem.updateMany({
          where: {
            id: verifyTaskItemId,
            status: {
              notIn: [TaskItemStatus.done, TaskItemStatus.canceled],
            },
          },
          data: { status: TaskItemStatus.todo },
        });
      }

      throw error; // Re-throw so trigger.dev still records the failure and retries
    }
  },
});
