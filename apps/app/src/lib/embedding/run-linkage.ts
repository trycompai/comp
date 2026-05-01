import { db } from '@db/server';
import { upsertEntityEmbeddings, findSimilarTasks } from './index';
import { linkSuggestions } from '../link-suggestions';

/**
 * Phase emitted by `runLinkage` via the optional `onPhase` callback.
 *
 * Consumed by the trigger.dev wrapper to mirror progress into run metadata so
 * the frontend can render a live progress indicator via `useRealtimeRun`.
 */
export type LinkagePhase =
  | { name: 'starting' }
  | { name: 'embedding-tasks'; current: number; total: number }
  | { name: 'embedding-risks'; current: number; total: number }
  | { name: 'embedding-vendors'; current: number; total: number }
  | { name: 'matching-risks'; current: number; total: number }
  | { name: 'matching-vendors'; current: number; total: number }
  | { name: 'done'; riskLinks: number; vendorLinks: number };

export interface RunLinkageInput {
  organizationId: string;
  /** When set, only link this single risk. */
  riskId?: string;
  /** When set, only link this single vendor. */
  vendorId?: string;
  /**
   * When `true`, disconnect ALL existing task links on the in-scope risk(s) /
   * vendor(s) before running the embedding match. This is destructive — it
   * wipes any manual unlinks the user made. Default `false` (additive).
   */
  replace?: boolean;
  /**
   * Optional progress callback. The trigger.dev wrapper passes this and writes
   * each phase to `metadata.set(...)` so the UI can subscribe via realtime.
   * Pure callers (e.g. tests, server-side scripts) can omit it.
   */
  onPhase?: (phase: LinkagePhase) => void;
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
 *
 * The optional `onPhase` callback emits structured progress events. The pure
 * function stays pure — the caller decides whether to wire it to metadata,
 * logs, or nothing at all.
 */
export async function runLinkage({
  organizationId,
  riskId,
  vendorId,
  replace,
  onPhase,
}: RunLinkageInput): Promise<RunLinkageOutput> {
  onPhase?.({ name: 'starting' });

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

  // When replace=true, wipe existing task links on every in-scope entity BEFORE
  // the embedding/matching loops so the connect step below builds linkage from
  // scratch. This is destructive — clears manual unlinks too.
  if (replace) {
    for (const risk of risks) {
      await db.risk.update({
        where: { id: risk.id },
        data: { tasks: { set: [] } },
      });
    }
    for (const vendor of vendors) {
      await db.vendor.update({
        where: { id: vendor.id },
        data: { tasks: { set: [] } },
      });
    }
  }

  if (tasks.length === 0) {
    onPhase?.({ name: 'done', riskLinks: 0, vendorLinks: 0 });
    return { riskLinks: 0, vendorLinks: 0 };
  }

  if (tasks.length > 0) {
    onPhase?.({ name: 'embedding-tasks', current: 0, total: tasks.length });
  }
  if (risks.length > 0) {
    onPhase?.({ name: 'embedding-risks', current: 0, total: risks.length });
  }
  if (vendors.length > 0) {
    onPhase?.({ name: 'embedding-vendors', current: 0, total: vendors.length });
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

  if (tasks.length > 0) {
    onPhase?.({ name: 'embedding-tasks', current: tasks.length, total: tasks.length });
  }
  if (risks.length > 0) {
    onPhase?.({ name: 'embedding-risks', current: risks.length, total: risks.length });
  }
  if (vendors.length > 0) {
    onPhase?.({ name: 'embedding-vendors', current: vendors.length, total: vendors.length });
  }

  let riskLinks = 0;
  for (let i = 0; i < risks.length; i++) {
    const risk = risks[i];
    onPhase?.({ name: 'matching-risks', current: i, total: risks.length });
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
  if (risks.length > 0) {
    onPhase?.({ name: 'matching-risks', current: risks.length, total: risks.length });
  }

  let vendorLinks = 0;
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    onPhase?.({ name: 'matching-vendors', current: i, total: vendors.length });
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
  if (vendors.length > 0) {
    onPhase?.({ name: 'matching-vendors', current: vendors.length, total: vendors.length });
  }

  onPhase?.({ name: 'done', riskLinks, vendorLinks });
  return { riskLinks, vendorLinks };
}
