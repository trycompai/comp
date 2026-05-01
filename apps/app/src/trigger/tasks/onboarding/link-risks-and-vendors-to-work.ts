import { logger, metadata, task } from '@trigger.dev/sdk';
import {
  runLinkage,
  type LinkagePhase,
  type RunLinkageInput,
} from '@/lib/embedding/run-linkage';

/**
 * Wraps `runLinkage` and mirrors progress phases into trigger.dev run metadata
 * so the frontend (subscribed via `useRealtimeRun` with a public-access token)
 * can render a live progress indicator across embedding + matching phases.
 *
 * Metadata schema (read by the UI as `run.metadata as Record<string, unknown>`):
 * - `phase`:     LinkagePhase['name']  (e.g. 'embedding-tasks', 'done')
 * - `current`:   number  (only present for phases with progress)
 * - `total`:     number  (only present for phases with progress)
 * - `riskLinks`: number  (only on the 'done' phase)
 * - `vendorLinks`: number  (only on the 'done' phase)
 */
export const linkRisksAndVendorsToWork = task({
  id: 'link-risks-and-vendors-to-work',
  retry: { maxAttempts: 2 },
  run: async (payload: RunLinkageInput) => {
    const { organizationId, riskId, vendorId, replace, suggestionsOnly } = payload;
    const mode = suggestionsOnly
      ? 'suggestions-only (no DB writes)'
      : replace
        ? 'replace (destructive)'
        : 'additive';
    const target = riskId
      ? `risk=${riskId}`
      : vendorId
        ? `vendor=${vendorId}`
        : 'all risks + all vendors';

    logger.info(`▶ start linkage`, { organizationId, target, mode });
    const startedAt = Date.now();
    const phaseStartedAt: Partial<Record<LinkagePhase['name'], number>> = {};

    const onPhase = (phase: LinkagePhase) => {
      // Mirror to metadata for the realtime UI subscriber.
      metadata.set('phase', phase.name);
      if ('current' in phase) metadata.set('current', phase.current);
      if ('total' in phase) metadata.set('total', phase.total);
      if ('riskLinks' in phase) metadata.set('riskLinks', phase.riskLinks);
      if ('vendorLinks' in phase) metadata.set('vendorLinks', phase.vendorLinks);

      // Structured per-phase logs. We log once at phase start (current=0 or
      // first sighting) and once at phase completion (current === total) so
      // the trigger.dev console reads as a clean timeline rather than a
      // per-tick stream.
      const isStart = !phaseStartedAt[phase.name];
      const hasProgress = 'current' in phase && 'total' in phase;
      const isCompletion = hasProgress && phase.current === phase.total;

      if (isStart) {
        phaseStartedAt[phase.name] = Date.now();
        if (phase.name === 'starting') {
          logger.info('· initializing scan');
          return;
        }
        if (phase.name === 'done') {
          // Handled below in the result log.
          return;
        }
        const sizeNote = hasProgress ? ` (${phase.total} item${phase.total === 1 ? '' : 's'})` : '';
        logger.info(`· ${phase.name}${sizeNote}`);
        return;
      }
      if (isCompletion) {
        const startMs = phaseStartedAt[phase.name];
        const elapsed = startMs ? `${((Date.now() - startMs) / 1000).toFixed(2)}s` : '?';
        logger.info(`· ${phase.name} done in ${elapsed}`);
      }
    };

    try {
      const result = await runLinkage({ ...payload, onPhase });
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
      const suggestionTaskCount = result.suggestions?.tasks.length ?? 0;
      const suggestionControlCount = result.suggestions?.controls.length ?? 0;
      logger.info(`✓ linkage complete in ${elapsed}s`, {
        organizationId,
        target,
        mode,
        riskLinks: result.riskLinks,
        vendorLinks: result.vendorLinks,
        ...(suggestionsOnly
          ? {
              suggestedTasks: suggestionTaskCount,
              suggestedControls: suggestionControlCount,
            }
          : {}),
      });
      return result;
    } catch (err) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
      logger.error(`✗ linkage failed after ${elapsed}s`, {
        organizationId,
        target,
        mode,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});
