import { db } from '@db/server';
import { upsertEntityEmbeddings, findSimilarTasks, waitForIndexed } from './index';
import { linkSuggestions } from '../link-suggestions';
import {
  rerankSuggestions,
  type RerankCandidate,
  type RerankedCandidate,
  type RerankSource,
} from '../rerank-suggestions';

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
  /**
   * Upstash Vector indexes upserted vectors asynchronously — emitted between
   * the embedding phase and matching phase while we poll `info()` until
   * `pendingVectorCount === 0`. Without this gate, the cosine queries can
   * race ahead of indexing and silently return zero candidates.
   */
  | { name: 'waiting-for-index' }
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
   * When `true`, runs the embedding + matching loop but DOES NOT persist any
   * task connections. The output includes a `suggestions` block the caller
   * can render in a review-before-apply UI. Mutually exclusive with `replace`
   * — when both are passed, suggestionsOnly wins (no DB writes).
   */
  suggestionsOnly?: boolean;
  /**
   * Optional progress callback. The trigger.dev wrapper passes this and writes
   * each phase to `metadata.set(...)` so the UI can subscribe via realtime.
   * Pure callers (e.g. tests, server-side scripts) can omit it.
   */
  onPhase?: (phase: LinkagePhase) => void;
}

export interface SuggestedTask {
  id: string;
  title: string;
  status: string;
  score: number;
}

export interface SuggestedControl {
  id: string;
  code: string;
  name: string;
  framework: string;
  /** Highest score of any suggested task that brought this control in. */
  score: number;
  /** Task ids that introduced this control (used by the UI to dim derived rows). */
  viaTaskIds: string[];
}

export interface RunLinkageOutput {
  riskLinks: number;
  vendorLinks: number;
  suggestions?: {
    forRiskId?: string;
    forVendorId?: string;
    tasks: SuggestedTask[];
    controls: SuggestedControl[];
  };
}

const RISK_QUERY_TOP_K = 25;
// In review-before-apply mode we go wide on recall (50 candidates from the
// vector store, no threshold filter, top-30 by cosine fed to the reranker),
// then let the LLM reranker do the precision step and surface the final 15.
// Cosine alone collapses into a tight 0.6 band on short compliance prose, so
// it's bad at ordering — but fine at "show me 30 that are at least related".
const SUGGESTIONS_QUERY_TOP_K = 50;
const SUGGESTIONS_RERANK_INPUT_TOP_K = 30;
const SUGGESTIONS_FINAL_TOP_K = 15;

// Autonomous (onboarding bulk) linking shares the same recall + rerank
// pipeline as suggestions-only. We persist any match scored ≥ 5/10 by
// the reranker (high confidence) AND always keep at least the top-N
// reranker scores so a risk never lands with zero linked work just
// because the LLM was conservative on a niche subject — the user can
// always unlink, but starting from "nothing" is worse UX than starting
// from "decent matches the user can review".
const AUTONOMOUS_QUERY_TOP_K = 50;
const AUTONOMOUS_RERANK_INPUT_TOP_K = 30;
const AUTONOMOUS_FINAL_TOP_K = 8;
const AUTONOMOUS_MIN_RERANK_SCORE = 5;
const AUTONOMOUS_MIN_LINKS_FLOOR = 3;

// Risk and vendor matching run in parallel, so this limit applies to
// EACH side independently. Keep it at 16 so both sides combined stay
// under ~32 concurrent LLM rerank calls.
const MATCH_CONCURRENCY = 16;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

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

interface RawTaskWithControls {
  id: string;
  title: string;
  status: string;
  controls: Array<{
    id: string;
    name: string;
    requirementsMapped: Array<{
      frameworkInstance: { framework: { name: string } } | null;
      requirement: { identifier: string } | null;
      customRequirement: { identifier: string } | null;
    }>;
  }>;
}

/**
 * Build SuggestedTask + SuggestedControl arrays for a single source entity
 * given the candidate task ids + scores returned by the matching step.
 */
async function buildSuggestions({
  organizationId,
  taskScores,
}: {
  organizationId: string;
  taskScores: Map<string, number>;
}): Promise<{ tasks: SuggestedTask[]; controls: SuggestedControl[] }> {
  const ids = [...taskScores.keys()];
  if (ids.length === 0) return { tasks: [], controls: [] };

  const enriched = (await db.task.findMany({
    where: { id: { in: ids }, organizationId },
    select: {
      id: true,
      title: true,
      status: true,
      controls: {
        select: {
          id: true,
          name: true,
          requirementsMapped: {
            select: {
              frameworkInstance: {
                select: { framework: { select: { name: true } } },
              },
              requirement: { select: { identifier: true } },
              customRequirement: { select: { identifier: true } },
            },
          },
        },
      },
    },
  })) as unknown as RawTaskWithControls[];

  // Sort by score desc so deterministic ordering survives the trip.
  const tasks: SuggestedTask[] = enriched
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      score: taskScores.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  const byId = new Map<string, SuggestedControl>();
  for (const t of enriched) {
    const taskScore = taskScores.get(t.id) ?? 0;
    for (const c of t.controls) {
      const mapping = c.requirementsMapped[0];
      const code =
        mapping?.requirement?.identifier ?? mapping?.customRequirement?.identifier ?? c.id;
      const framework = mapping?.frameworkInstance?.framework?.name ?? 'Custom';
      const existing = byId.get(c.id);
      if (existing) {
        if (taskScore > existing.score) existing.score = taskScore;
        if (!existing.viaTaskIds.includes(t.id)) existing.viaTaskIds.push(t.id);
        continue;
      }
      byId.set(c.id, {
        id: c.id,
        code,
        name: c.name,
        framework,
        score: taskScore,
        viaTaskIds: [t.id],
      });
    }
  }

  const controls = [...byId.values()].sort((a, b) => b.score - a.score);
  return { tasks, controls };
}

/**
 * Run the LLM reranker against the cosine candidates and return a final score
 * map (0-1, scaled from the reranker's 0-10 so it slots into the existing
 * SuggestedTask `score` field). Falls back to cosine ordering if the reranker
 * call fails so a transient OpenAI outage doesn't break the suggestions UI.
 */
async function rerankAndBuildScoreMap({
  source,
  links,
  taskById,
}: {
  source: RerankSource;
  links: Array<{ id: string; score: number }>;
  taskById: Map<string, { id: string; title: string; description: string }>;
}): Promise<Map<string, number>> {
  const candidates: RerankCandidate[] = [];
  for (const l of links) {
    const t = taskById.get(l.id);
    if (!t) continue;
    candidates.push({
      id: l.id,
      title: t.title,
      description: t.description,
      cosineScore: l.score,
    });
  }
  if (candidates.length === 0) return new Map();

  let reranked: RerankedCandidate[];
  try {
    console.info(
      `[linkage] reranking ${candidates.length} candidates for ${source.kind} "${source.title}"`,
    );
    const t0 = Date.now();
    reranked = await rerankSuggestions({ source, candidates });
    const top10 = reranked.slice(0, 10).map((r) => `${r.id}=${r.rerankScore.toFixed(1)}`);
    console.info(
      `[linkage] rerank done in ${((Date.now() - t0) / 1000).toFixed(2)}s; top: ${top10.join(', ')}`,
    );
  } catch (err) {
    console.error('[linkage] rerank failed; falling back to cosine', err);
    reranked = candidates
      .map((c) => ({
        id: c.id,
        cosineScore: c.cosineScore,
        rerankScore: c.cosineScore * 10,
      }))
      .sort((a, b) => b.rerankScore - a.rerankScore);
  }

  const top = reranked.slice(0, SUGGESTIONS_FINAL_TOP_K);
  return new Map(top.map((r) => [r.id, r.rerankScore / 10]));
}

/**
 * Autonomous-path variant: same recall + rerank pipeline as suggestionsOnly,
 * but returns the IDs to persist directly. Filters by a minimum reranker
 * score so we only auto-link confidently-relevant work — the user isn't
 * reviewing these, so false positives stick until manually unlinked.
 */
async function rerankForAutonomousPersist({
  source,
  links,
  taskById,
}: {
  source: RerankSource;
  links: Array<{ id: string; score: number }>;
  taskById: Map<string, { id: string; title: string; description: string }>;
}): Promise<string[]> {
  const candidates: RerankCandidate[] = [];
  for (const l of links) {
    const t = taskById.get(l.id);
    if (!t) continue;
    candidates.push({
      id: l.id,
      title: t.title,
      description: t.description,
      cosineScore: l.score,
    });
  }
  if (candidates.length === 0) return [];

  let reranked: RerankedCandidate[];
  try {
    reranked = await rerankSuggestions({ source, candidates });
  } catch (err) {
    console.error('[linkage] autonomous rerank failed; falling back to cosine', err);
    reranked = candidates
      .map((c) => ({
        id: c.id,
        cosineScore: c.cosineScore,
        rerankScore: c.cosineScore * 10,
      }))
      .sort((a, b) => b.rerankScore - a.rerankScore);
  }

  // Sorted desc by rerankScore (rerankSuggestions guarantees this).
  const highConfidence = reranked.filter(
    (r) => r.rerankScore >= AUTONOMOUS_MIN_RERANK_SCORE,
  );
  // If the reranker was conservative for this entity, fall back to the
  // top-N by score so the risk isn't left with zero links. The user
  // reviews via the Linked Work column; better to have 3 decent matches
  // than nothing.
  const finalList =
    highConfidence.length >= AUTONOMOUS_MIN_LINKS_FLOOR
      ? highConfidence
      : reranked.slice(0, AUTONOMOUS_MIN_LINKS_FLOOR);
  return finalList.slice(0, AUTONOMOUS_FINAL_TOP_K).map((r) => r.id);
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
 *
 * When `suggestionsOnly` is true, persistence is skipped and `output.suggestions`
 * is populated so the caller can present a review-before-apply UI.
 */
export async function runLinkage({
  organizationId,
  riskId,
  vendorId,
  replace,
  suggestionsOnly,
  onPhase,
}: RunLinkageInput): Promise<RunLinkageOutput> {
  onPhase?.({ name: 'starting' });

  // When the caller pins a specific entity, skip loading the other side
  // entirely — embedding all vendors when the user only asked about one risk
  // is wasted OpenAI cost (and vice versa).
  const wantRisks = !vendorId;
  const wantVendors = !riskId;

  // The 3 initial scope queries are independent — fan them out instead of
  // serializing. Tasks are scoped to purchased-framework coverage:
  // `Control.archivedAt` is set when the org's framework subscription drops
  // the control, so unarchived implies actively-purchased. Custom user tasks
  // with no controls are kept (still org-owned and worth suggesting).
  const [risks, vendors, tasks] = await Promise.all([
    wantRisks
      ? db.risk.findMany({
          where: { organizationId, ...(riskId ? { id: riskId } : {}) },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            department: true,
            embeddingHash: true,
          },
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof db.risk.findMany>>),
    wantVendors
      ? db.vendor.findMany({
          where: { organizationId, ...(vendorId ? { id: vendorId } : {}) },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            embeddingHash: true,
          },
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof db.vendor.findMany>>),
    db.task.findMany({
      where: {
        organizationId,
        OR: [
          { controls: { some: { archivedAt: null } } },
          { controls: { none: {} } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        department: true,
        embeddingHash: true,
      },
    }),
  ]);

  console.info(
    `[linkage] scope: ${tasks.length} tasks, ${risks.length} risks, ${vendors.length} vendors (org=${organizationId})`,
  );

  // When replace=true, wipe existing task links on every in-scope entity
  // BEFORE the matching loops so the connect step below builds linkage from
  // scratch. Run all the disconnects in parallel.
  // When suggestionsOnly is set, skip this step entirely (no DB writes).
  if (replace && !suggestionsOnly) {
    await Promise.all([
      ...risks.map((r) =>
        db.risk.update({ where: { id: r.id }, data: { tasks: { set: [] } } }),
      ),
      ...vendors.map((v) =>
        db.vendor.update({ where: { id: v.id }, data: { tasks: { set: [] } } }),
      ),
    ]);
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

  // Build id → hash maps for skip-if-unchanged. Anything with a non-null
  // hash that still matches the current text gets skipped at the upsert
  // layer — saving both the OpenAI embedding call and the Upstash write.
  const taskHashes = new Map<string, string>();
  for (const t of tasks) {
    if (t.embeddingHash !== null) taskHashes.set(t.id, t.embeddingHash);
  }
  const riskHashes = new Map<string, string>();
  for (const r of risks) {
    if (r.embeddingHash !== null) riskHashes.set(r.id, r.embeddingHash);
  }
  const vendorHashes = new Map<string, string>();
  for (const v of vendors) {
    if (v.embeddingHash !== null) vendorHashes.set(v.id, v.embeddingHash);
  }

  const [taskUpsert, riskUpsert, vendorUpsert] = await Promise.all([
    upsertEntityEmbeddings({
      organizationId,
      kind: 'task',
      entities: tasks.map((t) => ({
        id: t.id,
        text: taskQueryText(t),
        department: t.department ?? undefined,
      })),
      existingHashes: taskHashes,
    }),
    upsertEntityEmbeddings({
      organizationId,
      kind: 'risk',
      entities: risks.map((r) => ({
        id: r.id,
        text: riskQueryText(r),
        department: r.department ?? undefined,
      })),
      existingHashes: riskHashes,
    }),
    upsertEntityEmbeddings({
      organizationId,
      kind: 'vendor',
      entities: vendors.map((v) => ({
        id: v.id,
        text: vendorQueryText(v),
      })),
      existingHashes: vendorHashes,
    }),
  ]);

  // Persist the freshly-computed hashes so the next linkage run can skip
  // these entities. Rows whose content was unchanged are not in the
  // appliedHashes list, so they keep their existing hash. Run all three
  // kinds' updates in parallel.
  const persistHashWrites: Array<Promise<unknown>> = [];
  for (const { id, hash } of taskUpsert.appliedHashes) {
    persistHashWrites.push(db.task.update({ where: { id }, data: { embeddingHash: hash } }));
  }
  for (const { id, hash } of riskUpsert.appliedHashes) {
    persistHashWrites.push(db.risk.update({ where: { id }, data: { embeddingHash: hash } }));
  }
  for (const { id, hash } of vendorUpsert.appliedHashes) {
    persistHashWrites.push(db.vendor.update({ where: { id }, data: { embeddingHash: hash } }));
  }
  if (persistHashWrites.length > 0) {
    await Promise.all(persistHashWrites);
  }

  console.info(
    `[linkage] embeddings: tasks ${taskUpsert.appliedHashes.length} new / ${taskUpsert.skippedCount} cached, ` +
      `risks ${riskUpsert.appliedHashes.length} new / ${riskUpsert.skippedCount} cached, ` +
      `vendors ${vendorUpsert.appliedHashes.length} new / ${vendorUpsert.skippedCount} cached`,
  );

  if (tasks.length > 0) {
    onPhase?.({ name: 'embedding-tasks', current: tasks.length, total: tasks.length });
  }
  if (risks.length > 0) {
    onPhase?.({ name: 'embedding-risks', current: risks.length, total: risks.length });
  }
  if (vendors.length > 0) {
    onPhase?.({ name: 'embedding-vendors', current: vendors.length, total: vendors.length });
  }

  // Block matching until Upstash has finished indexing the vectors we just
  // wrote. The HNSW index is built asynchronously after upsert, so cosine
  // queries that race ahead silently return zero candidates for IDs that
  // are still pending. We hit this in onboarding when 6 of 11 risks got 0
  // links because their queries fired ~4s after upsert vs the next 5 risks
  // that fired ~5s after and got full results.
  //
  // Skip the wait entirely when every embedding was served from the cache
  // (the dedup hash path) — the existing vectors are already queryable
  // and there's nothing pending from this run.
  const upsertedCount =
    taskUpsert.appliedHashes.length +
    riskUpsert.appliedHashes.length +
    vendorUpsert.appliedHashes.length;
  if (upsertedCount > 0) {
    onPhase?.({ name: 'waiting-for-index' });
    const indexWait = await waitForIndexed({ maxWaitMs: 30_000 });
    if (indexWait.pendingAtTimeout !== undefined) {
      console.warn(
        `[linkage] vector index still has ${indexWait.pendingAtTimeout} pending vector(s) after ${indexWait.waitedMs}ms (${indexWait.polls} polls); proceeding anyway`,
      );
    } else {
      console.info(
        `[linkage] vector index drained in ${indexWait.waitedMs}ms (${indexWait.polls} polls)`,
      );
    }
  } else {
    console.info('[linkage] all embeddings cached; skipping index drain wait');
  }

  // Map for the LLM reranker (suggestionsOnly path) to look up titles/desc
  // without an extra DB round trip.
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  let suggestions: RunLinkageOutput['suggestions'];

  // Emit initial matching phases before the parallel fan-out so the UI shows
  // both phases starting at once.
  if (risks.length > 0) {
    onPhase?.({ name: 'matching-risks', current: 0, total: risks.length });
  }
  if (vendors.length > 0) {
    onPhase?.({ name: 'matching-vendors', current: 0, total: vendors.length });
  }

  // Risk + vendor matching run in parallel — they write to separate DB
  // tables (Risk.tasks vs Vendor.tasks) and the shared taskById is read-only.
  let completedRisks = 0;
  let completedVendors = 0;

  const [riskOutcomes, vendorOutcomes] = await Promise.all([
    mapWithConcurrency(risks, MATCH_CONCURRENCY, async (risk) => {
    const similar = await findSimilarTasks({
      organizationId,
      queryText: riskQueryText(risk),
      topK: suggestionsOnly ? SUGGESTIONS_QUERY_TOP_K : AUTONOMOUS_QUERY_TOP_K,
    });
    console.info(
      `[linkage] risk "${risk.title}" → cosine returned ${similar.length} candidates` +
        (similar.length > 0
          ? ` (top scores: ${similar
              .slice(0, 3)
              .map((s) => s.score.toFixed(2))
              .join(', ')})`
          : ''),
    );
    // Both paths feed the reranker — autonomous needs it just as badly to
    // get past the 0.4-0.6 cosine band that dominates compliance prose.
    const links = linkSuggestions({
      source: { department: risk.department ?? undefined },
      candidates: similar.map((s) => ({ id: s.id, score: s.score, department: s.department })),
      threshold: 0,
      topK: suggestionsOnly ? SUGGESTIONS_RERANK_INPUT_TOP_K : AUTONOMOUS_RERANK_INPUT_TOP_K,
    });
    let count = 0;
    let perEntitySuggestions: RunLinkageOutput['suggestions'];
    const inScopeMatches = links.filter((l) => taskById.has(l.id)).length;
    if (inScopeMatches !== links.length) {
      console.warn(
        `[linkage] risk "${risk.title}" → ${links.length - inScopeMatches} of ${links.length} cosine matches dropped (not in task scope after filter)`,
      );
    }
    if (links.length > 0) {
      const source: RerankSource = {
        kind: 'risk',
        title: risk.title,
        description: risk.description,
        category: risk.category,
        department: risk.department ?? undefined,
      };
      if (suggestionsOnly) {
        const taskScores = await rerankAndBuildScoreMap({
          source,
          links,
          taskById,
        });
        const built = await buildSuggestions({ organizationId, taskScores });
        perEntitySuggestions = { forRiskId: risk.id, ...built };
        count = taskScores.size;
        console.info(
          `[linkage] risk "${risk.title}" → suggestions: ${count} tasks, ${built.controls.length} controls`,
        );
      } else {
        const idsToConnect = await rerankForAutonomousPersist({
          source,
          links,
          taskById,
        });
        if (idsToConnect.length > 0) {
          await db.risk.update({
            where: { id: risk.id },
            data: { tasks: { connect: idsToConnect.map((id) => ({ id })) } },
          });
        }
        count = idsToConnect.length;
        console.info(
          `[linkage] risk "${risk.title}" → persisted ${count} task link(s)`,
        );
      }
    } else {
      console.warn(
        `[linkage] risk "${risk.title}" → 0 candidates after linkSuggestions; skipping rerank`,
      );
    }
    completedRisks += 1;
    onPhase?.({ name: 'matching-risks', current: completedRisks, total: risks.length });
    return { count, perEntitySuggestions };
    }),
    mapWithConcurrency(vendors, MATCH_CONCURRENCY, async (vendor) => {
    const similar = await findSimilarTasks({
      organizationId,
      queryText: vendorQueryText(vendor),
      topK: suggestionsOnly ? SUGGESTIONS_QUERY_TOP_K : AUTONOMOUS_QUERY_TOP_K,
    });
    const links = linkSuggestions({
      source: {},
      candidates: similar.map((s) => ({ id: s.id, score: s.score, department: s.department })),
      threshold: 0,
      topK: suggestionsOnly ? SUGGESTIONS_RERANK_INPUT_TOP_K : AUTONOMOUS_RERANK_INPUT_TOP_K,
    });
    let count = 0;
    let perEntitySuggestions: RunLinkageOutput['suggestions'];
    if (links.length > 0) {
      const source: RerankSource = {
        kind: 'vendor',
        title: vendor.name,
        description: vendor.description,
        category: vendor.category,
      };
      if (suggestionsOnly) {
        const taskScores = await rerankAndBuildScoreMap({
          source,
          links,
          taskById,
        });
        const built = await buildSuggestions({ organizationId, taskScores });
        perEntitySuggestions = { forVendorId: vendor.id, ...built };
        count = taskScores.size;
      } else {
        const idsToConnect = await rerankForAutonomousPersist({
          source,
          links,
          taskById,
        });
        if (idsToConnect.length > 0) {
          await db.vendor.update({
            where: { id: vendor.id },
            data: { tasks: { connect: idsToConnect.map((id) => ({ id })) } },
          });
        }
        count = idsToConnect.length;
      }
    }
    completedVendors += 1;
    onPhase?.({ name: 'matching-vendors', current: completedVendors, total: vendors.length });
    return { count, perEntitySuggestions };
  }),
  ]);

  const riskLinks = riskOutcomes.reduce((sum, r) => sum + r.count, 0);
  const vendorLinks = vendorOutcomes.reduce((sum, v) => sum + v.count, 0);
  for (const r of riskOutcomes) {
    if (r.perEntitySuggestions) {
      suggestions = r.perEntitySuggestions;
      break;
    }
  }
  if (!suggestions) {
    for (const v of vendorOutcomes) {
      if (v.perEntitySuggestions) {
        suggestions = v.perEntitySuggestions;
        break;
      }
    }
  }

  onPhase?.({ name: 'done', riskLinks, vendorLinks });
  return suggestionsOnly ? { riskLinks, vendorLinks, suggestions } : { riskLinks, vendorLinks };
}
