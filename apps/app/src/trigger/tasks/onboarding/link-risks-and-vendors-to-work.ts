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
    const { organizationId, riskId, vendorId } = payload;
    logger.info('linkRisksAndVendorsToWork:start', { organizationId, riskId, vendorId });

    const onPhase = (phase: LinkagePhase) => {
      metadata.set('phase', phase.name);
      if ('current' in phase) metadata.set('current', phase.current);
      if ('total' in phase) metadata.set('total', phase.total);
      if ('riskLinks' in phase) metadata.set('riskLinks', phase.riskLinks);
      if ('vendorLinks' in phase) metadata.set('vendorLinks', phase.vendorLinks);
    };

    const result = await runLinkage({ ...payload, onPhase });
    logger.info('linkRisksAndVendorsToWork:done', { organizationId, ...result });
    return result;
  },
});
