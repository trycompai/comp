import { logger, task } from '@trigger.dev/sdk';
import { runLinkage, type RunLinkageInput } from '@/lib/embedding/run-linkage';

export const linkRisksAndVendorsToWork = task({
  id: 'link-risks-and-vendors-to-work',
  retry: { maxAttempts: 2 },
  run: async (payload: RunLinkageInput) => {
    const { organizationId, riskId, vendorId } = payload;
    logger.info('linkRisksAndVendorsToWork:start', { organizationId, riskId, vendorId });
    const result = await runLinkage(payload);
    logger.info('linkRisksAndVendorsToWork:done', { organizationId, ...result });
    return result;
  },
});
