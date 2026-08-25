import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { fetchAllStat, hidOf, hostName, pickString, rmmToken } from '../client';
import type { RmmRecord } from '../types';

export const deviceListCheck: IntegrationCheck = {
  id: 'device-list',
  name: 'MSP360 RMM device list',
  description: 'Fleet host inventory from GET /api/v1/computers/stat/host/latest (paged).',
  service: 'inventory',
  taskMapping: TASK_TEMPLATES.deviceList,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 RMM device-list check');
    if (!rmmToken(ctx)) {
      ctx.fail({
        title: 'Missing MSP360 RMM API token',
        description: 'This integration needs a Bearer token from Settings → General → RMM API tokens.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm',
        severity: 'high',
        remediation:
          'Create an RMM API token for an administrator who has an RMM license. Community Edition has no API. Do not use Backup Provider Login here.',
      });
      return;
    }

    let hosts: RmmRecord[];
    try {
      hosts = await fetchAllStat(ctx, 'host');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to fetch MSP360 RMM hosts',
        description: 'The fleet host endpoint returned an error or unauthorized response.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-hosts',
        severity: 'high',
        remediation: 'Confirm the RMM token, license, and base URL (https://api.rmm.mspbackups.com).',
        evidence: { error: message },
      });
      return;
    }

    if (hosts.length === 0) {
      ctx.fail({
        title: 'MSP360 RMM returned no devices',
        description: 'Host inventory was empty.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-hosts',
        severity: 'medium',
        remediation: 'Confirm RMM agents are installed and the token can read computer stats.',
      });
      return;
    }

    const checkedAt = new Date().toISOString();
    for (const [index, host] of hosts.entries()) {
      const hid = hidOf(host, `host-${index}`);
      const name = hostName(host, hid);
      ctx.pass({
        title: `Device: ${name}`,
        description: 'Listed from MSP360 RMM host inventory.',
        resourceType: 'device',
        resourceId: hid,
        evidence: {
          hid,
          name,
          os: pickString(host, ['os', 'OS', 'osName', 'operatingSystem']),
          manufacturer: pickString(host, ['manufacturer', 'Manufacturer']),
          model: pickString(host, ['model', 'Model']),
          serial: pickString(host, ['serial', 'Serial', 'serialNumber', 'SerialNumber']),
          ip: pickString(host, ['ip', 'IP', 'ipAddress', 'IpAddress']),
          mac: pickString(host, ['mac', 'MAC', 'macAddress']),
          location: pickString(host, ['location', 'Location']),
          raw: host,
          checkedAt,
        },
      });
    }
  },
};
