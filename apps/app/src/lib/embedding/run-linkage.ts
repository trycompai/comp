import { db } from '@db/server';
import { upsertEntityEmbeddings, findSimilarTasks } from './index';
import { linkSuggestions } from '../link-suggestions';

export interface RunLinkageInput {
  organizationId: string;
  /** When set, only link this single risk. */
  riskId?: string;
  /** When set, only link this single vendor. */
  vendorId?: string;
}

export interface RunLinkageOutput {
  riskLinks: number;
  vendorLinks: number;
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

/**
 * Embeds the org's risks/vendors/tasks (idempotent), then for each risk and
 * vendor in scope finds the top-K similar tasks above the threshold and
 * persists `Risk.tasks` / `Vendor.tasks` connections via Prisma.
 *
 * Used by both the onboarding trigger task and the on-demand API endpoints,
 * so the API route can return the real link count without polling a trigger.
 */
export async function runLinkage({
  organizationId,
  riskId,
  vendorId,
}: RunLinkageInput): Promise<RunLinkageOutput> {
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
    return { riskLinks: 0, vendorLinks: 0 };
  }

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

  let riskLinks = 0;
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
    riskLinks += links.length;
  }

  let vendorLinks = 0;
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
    vendorLinks += links.length;
  }

  return { riskLinks, vendorLinks };
}
