import { db, TaskFrequency } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import {
  runOrgBrowserAutomations,
  type OrgBrowserAutomation,
} from './run-org-browser-automations';
import { isDueToday } from '../shared/is-due-today';
import { normalizeHostnameFromUrl } from '../../browserbase/browserbase-url';

/**
 * Pure helper extracted for unit testing. Filters a list of candidate
 * automations down to those whose schedule says they are due at `now`.
 *
 * Kept in-memory (Shape A from the plan) because the single source of truth
 * for schedule math is `isDueToday`; duplicating it in SQL would create drift.
 */
export function filterDueAutomations<
  T extends {
    scheduleFrequency: TaskFrequency;
    lastRunAt: Date | null;
  },
>({ automations, now }: { automations: T[]; now: Date }): T[] {
  return automations.filter((a) =>
    isDueToday({
      scheduleFrequency: a.scheduleFrequency,
      lastRunAt: a.lastRunAt,
      now,
    }),
  );
}

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function limitAutomationBatch<
  T extends {
    id?: string;
    lastRunAt?: Date | null;
    targetUrl: string;
    task: { organizationId: string };
  },
>({
  automations,
  maxPerOrg,
  maxPerHostname,
}: {
  automations: T[];
  maxPerOrg: number;
  maxPerHostname: number;
}): T[] {
  const orgCounts = new Map<string, number>();
  const hostnameCounts = new Map<string, number>();
  const selected: T[] = [];
  const sortedAutomations = [...automations].sort(
    (a, b) => (a.lastRunAt?.getTime() ?? 0) - (b.lastRunAt?.getTime() ?? 0),
  );

  for (const automation of sortedAutomations) {
    const organizationId = automation.task.organizationId;
    let hostname: string;
    try {
      hostname = normalizeHostnameFromUrl(automation.targetUrl);
    } catch (error) {
      logger.warn('Skipping browser automation with invalid target URL', {
        automationId: automation.id,
        targetUrl: automation.targetUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    const orgCount = orgCounts.get(organizationId) ?? 0;
    const hostnameCount = hostnameCounts.get(hostname) ?? 0;

    if (orgCount >= maxPerOrg || hostnameCount >= maxPerHostname) {
      continue;
    }

    orgCounts.set(organizationId, orgCount + 1);
    hostnameCounts.set(hostname, hostnameCount + 1);
    selected.push(automation);
  }

  return selected;
}

/** One org's worth of scheduled automations, ready for the per-org runner. */
export interface OrgAutomationGroup {
  organizationId: string;
  organizationName: string;
  automations: OrgBrowserAutomation[];
}

/**
 * Group the flat, already-capped automation list into one entry per org,
 * attaching each org's display name. Pure + exported for unit testing. This is
 * what lets failures bundle into a single email per org (one runner → one email)
 * instead of one independent run per automation. Mirrors groupTasksByOrg in the
 * integration orchestrator.
 */
export function groupAutomationsByOrg<
  T extends {
    id: string;
    name: string;
    taskId: string;
    task: { organizationId: string };
  },
>({
  automations,
  orgNameById,
}: {
  automations: T[];
  orgNameById: Map<string, string>;
}): OrgAutomationGroup[] {
  const byOrg = new Map<string, OrgAutomationGroup>();
  for (const a of automations) {
    const organizationId = a.task.organizationId;
    let group = byOrg.get(organizationId);
    if (!group) {
      group = {
        organizationId,
        organizationName:
          orgNameById.get(organizationId) ?? 'your organization',
        automations: [],
      };
      byOrg.set(organizationId, group);
    }
    group.automations.push({
      automationId: a.id,
      automationName: a.name,
      taskId: a.taskId,
    });
  }
  return Array.from(byOrg.values());
}

/**
 * Daily scheduled task (orchestrator) that finds all enabled browser automations
 * and dispatches one per-org runner for each org, which runs that org's
 * automations and sends a single bundled failure email.
 */
export const browserAutomationsSchedule = schedules.task({
  id: 'browser-automations-schedule',
  cron: '0 5 * * *', // Daily at 5:00 AM UTC
  maxDuration: 60 * 30, // 30 minutes — Trigger.dev maxDuration is in SECONDS
  run: async (payload) => {
    logger.info('Starting daily browser automations orchestrator', {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    const now = new Date();

    // Find all enabled browser automations
    const candidateAutomations = await db.browserAutomation.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        taskId: true,
        targetUrl: true,
        scheduleFrequency: true,
        lastRunAt: true,
        task: {
          select: {
            id: true,
            title: true,
            organizationId: true,
          },
        },
      },
    });

    if (candidateAutomations.length === 0) {
      logger.info('No enabled browser automations found');
      return { success: true, automationsTriggered: 0 };
    }

    logger.info(
      `Found ${candidateAutomations.length} enabled browser automations`,
    );

    // Filter by the automation's schedule. `lastRunAt` is only written when
    // the automation actually executed (including legitimate 'fail' verdicts)
    // inside `runBrowserAutomation`, so infra-level failures naturally retry
    // on the next orchestrator tick (the "crude retry" behavior).
    const automations = filterDueAutomations({
      automations: candidateAutomations,
      now,
    });

    if (automations.length < candidateAutomations.length) {
      logger.info(
        `Skipped ${candidateAutomations.length - automations.length} automation(s) not due yet`,
      );
    }

    if (automations.length === 0) {
      logger.info('No browser automations due today');
      return { success: true, automationsTriggered: 0 };
    }

    const limitedAutomations = limitAutomationBatch({
      automations,
      maxPerOrg: parsePositiveInt(
        process.env.BROWSER_AUTOMATION_ORG_CONCURRENCY,
        5,
      ),
      maxPerHostname: parsePositiveInt(
        process.env.BROWSER_AUTOMATION_HOST_CONCURRENCY,
        3,
      ),
    });

    if (limitedAutomations.length < automations.length) {
      logger.info(
        `Deferred ${automations.length - limitedAutomations.length} automation(s) due to org/domain concurrency limits`,
      );
    }

    // Group the capped list into one runner per org so this org's failures
    // bundle into a single email (mirrors the integration orchestrator).
    const orgIds = [
      ...new Set(limitedAutomations.map((a) => a.task.organizationId)),
    ];
    const orgs = await db.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgNameById = new Map(orgs.map((o) => [o.id, o.name] as const));

    const orgGroups = groupAutomationsByOrg({
      automations: limitedAutomations,
      orgNameById,
    });

    // Dispatch per-org runners (fire-and-forget). Each runner internally waits
    // on its own automation runs and sends one bundled failure email.
    const ORG_BATCH_SIZE = 100;
    const triggerPayloads = orgGroups.map((g) => ({ payload: g }));
    let orgsTriggered = 0;
    let automationsTriggered = 0;

    try {
      for (let i = 0; i < triggerPayloads.length; i += ORG_BATCH_SIZE) {
        const batch = triggerPayloads.slice(i, i + ORG_BATCH_SIZE);
        await runOrgBrowserAutomations.batchTrigger(batch);
        orgsTriggered += batch.length;
        automationsTriggered += batch.reduce(
          (n, p) => n + p.payload.automations.length,
          0,
        );

        logger.info(
          `Triggered org batch ${Math.floor(i / ORG_BATCH_SIZE) + 1}: ${batch.length} org(s)`,
        );
      }

      logger.info(
        `Triggered ${orgsTriggered} org runner(s) covering ${automationsTriggered} automation(s)`,
      );

      return {
        success: true,
        automationsTriggered,
      };
    } catch (error) {
      logger.error('Failed to trigger browser automations', {
        error: error instanceof Error ? error.message : String(error),
        triggeredBeforeError: automationsTriggered,
      });

      return {
        success: false,
        automationsTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
