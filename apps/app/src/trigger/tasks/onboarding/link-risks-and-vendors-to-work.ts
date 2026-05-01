import { db } from '@db/server';
import { logger, task } from '@trigger.dev/sdk';
import { upsertEntityEmbeddings, findSimilarTasks } from '@/lib/embedding';
import { linkSuggestions } from '@/lib/link-suggestions';

interface Payload {
  organizationId: string;
  /** When set, only link this single risk (used by the on-demand button). */
  riskId?: string;
  /** When set, only link this single vendor (used by the on-demand button). */
  vendorId?: string;
}

const RISK_QUERY_TOP_K = 25;

function riskQueryText(risk: {
  title: string;
  description: string;
  category: string;
  department: string | null;
}): string {
  return [
    risk.title,
    risk.description,
    `Category: ${risk.category}`,
    risk.department ? `Department: ${risk.department}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function vendorQueryText(vendor: {
  name: string;
  description: string;
  category: string;
}): string {
  return [vendor.name, vendor.description, `Category: ${vendor.category}`].join('\n');
}

function taskQueryText(t: { title: string; description: string }): string {
  return [t.title, t.description].filter(Boolean).join('\n');
}

export const linkRisksAndVendorsToWork = task({
  id: 'link-risks-and-vendors-to-work',
  retry: { maxAttempts: 2 },
  run: async (payload: Payload) => {
    const { organizationId, riskId, vendorId } = payload;
    logger.info('linkRisksAndVendorsToWork:start', { organizationId, riskId, vendorId });

    const risks = await db.risk.findMany({
      where: { organizationId, ...(riskId ? { id: riskId } : {}) },
      select: { id: true, title: true, description: true, category: true, department: true },
    });
    const vendors = await db.vendor.findMany({
      where: { organizationId, ...(vendorId ? { id: vendorId } : {}) },
      select: { id: true, name: true, description: true, category: true },
    });
    const tasks = await db.task.findMany({
      where: { organizationId },
      select: { id: true, title: true, description: true, department: true },
    });

    if (tasks.length === 0) {
      logger.info('linkRisksAndVendorsToWork:no-tasks', { organizationId });
      return { riskLinks: 0, vendorLinks: 0 };
    }

    // Embed all three entity sets up-front. Idempotent re-embeds are cheap on Upstash.
    await Promise.all([
      upsertEntityEmbeddings({
        organizationId,
        kind: 'task',
        entities: tasks.map((t) => ({
          id: t.id,
          text: taskQueryText(t),
          department: t.department ?? undefined,
        })),
      }),
      upsertEntityEmbeddings({
        organizationId,
        kind: 'risk',
        entities: risks.map((r) => ({
          id: r.id,
          text: riskQueryText(r),
          department: r.department ?? undefined,
        })),
      }),
      upsertEntityEmbeddings({
        organizationId,
        kind: 'vendor',
        entities: vendors.map((v) => ({
          id: v.id,
          text: vendorQueryText(v),
        })),
      }),
    ]);

    let riskLinkCount = 0;
    for (const risk of risks) {
      const similar = await findSimilarTasks({
        organizationId,
        queryText: riskQueryText(risk),
        topK: RISK_QUERY_TOP_K,
      });
      const links = linkSuggestions({
        source: { department: risk.department ?? undefined },
        candidates: similar.map((s) => ({ id: s.id, score: s.score, department: s.department })),
      });
      if (links.length === 0) continue;
      await db.risk.update({
        where: { id: risk.id },
        data: { tasks: { connect: links.map((l) => ({ id: l.id })) } },
      });
      riskLinkCount += links.length;
    }

    let vendorLinkCount = 0;
    for (const vendor of vendors) {
      const similar = await findSimilarTasks({
        organizationId,
        queryText: vendorQueryText(vendor),
        topK: RISK_QUERY_TOP_K,
      });
      const links = linkSuggestions({
        source: {},
        candidates: similar.map((s) => ({ id: s.id, score: s.score, department: s.department })),
      });
      if (links.length === 0) continue;
      await db.vendor.update({
        where: { id: vendor.id },
        data: { tasks: { connect: links.map((l) => ({ id: l.id })) } },
      });
      vendorLinkCount += links.length;
    }

    logger.info('linkRisksAndVendorsToWork:done', {
      organizationId,
      riskLinkCount,
      vendorLinkCount,
    });

    return { riskLinks: riskLinkCount, vendorLinks: vendorLinkCount };
  },
});
