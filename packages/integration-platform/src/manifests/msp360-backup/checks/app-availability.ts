import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { bearerHeaders, loginBackup } from '../auth';
import type { Msp360Admin } from '../types';

export const appAvailabilityCheck: IntegrationCheck = {
  id: 'app-availability',
  name: 'MSP360 Backup availability',
  description:
    'Verify Managed Backup is reachable: Provider Login plus an authenticated API ping. Console HTML is not used because Comp AI fetch expects JSON.',
  service: 'availability',
  taskMapping: TASK_TEMPLATES.appAvailability,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 Backup app availability check');

    const session = await loginBackup(ctx);
    if (!session) {
      return;
    }

    try {
      await ctx.fetch<Msp360Admin[] | unknown>('/api/Administrators', {
        baseUrl: session.baseUrl,
        headers: bearerHeaders(session.token),
      });
      ctx.pass({
        title: 'MSP360 Backup API is available',
        description:
          'Provider Login succeeded and GET /api/Administrators returned a response over HTTPS. That is the availability ping (the management console is HTML, not JSON).',
        resourceType: 'service',
        resourceId: 'msp360-backup',
        evidence: {
          login: 'ok',
          pingPath: '/api/Administrators',
          baseUrl: session.baseUrl,
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'MSP360 Backup API ping failed',
        description: 'Login worked but GET /api/Administrators failed.',
        resourceType: 'service',
        resourceId: 'msp360-backup',
        severity: 'high',
        remediation:
          'Confirm the API user can list administrators and that api.mspbackups.com is reachable from Comp AI.',
        evidence: { error: message },
      });
    }
  },
};
