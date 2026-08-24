import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { fetchAllStat, hidOf, indexByHid, pickString, rmmToken } from '../client';
import type { RmmRecord } from '../types';

export const infrastructureInventoryCheck: IntegrationCheck = {
  id: 'infrastructure-inventory',
  name: 'MSP360 RMM infrastructure inventory',
  description:
    'Join host + hardware + software fleet stats by hid. Inventory refreshes about hourly; polling faster than that will not yield newer data.',
  service: 'inventory',
  taskMapping: TASK_TEMPLATES.infrastructureInventory,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 RMM infrastructure-inventory check');
    if (!rmmToken(ctx)) {
      ctx.fail({
        title: 'Missing MSP360 RMM API token',
        description: 'Inventory evidence needs the RMM Bearer token.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm',
        severity: 'high',
        remediation: 'Use Settings → General → RMM API tokens. Do not mix Backup Provider Login into this connection.',
      });
      return;
    }

    let hosts: RmmRecord[];
    let hardware: RmmRecord[] = [];
    let software: RmmRecord[] = [];
    try {
      hosts = await fetchAllStat(ctx, 'host');
      hardware = await fetchAllStat(ctx, 'hardware');
      software = await fetchAllStat(ctx, 'software');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to fetch MSP360 RMM inventory',
        description: 'Host/hardware/software fleet endpoints failed.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-inventory',
        severity: 'high',
        remediation: 'Confirm the RMM token can read computer stats.',
        evidence: { error: message },
      });
      return;
    }

    if (hosts.length === 0) {
      ctx.fail({
        title: 'MSP360 RMM host list is empty',
        description: 'Infrastructure inventory cannot be built without hosts.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-inventory',
        severity: 'medium',
        remediation: 'Confirm agents exist in this RMM tenant.',
      });
      return;
    }

    const hwByHid = indexByHid(hardware);
    const swByHid = indexByHid(software);
    const checkedAt = new Date().toISOString();

    ctx.pass({
      title: 'MSP360 RMM inventory snapshot',
      description: `Joined ${hosts.length} host(s) with hardware and software rows keyed by hid.`,
      resourceType: 'service',
      resourceId: 'msp360-rmm-inventory-summary',
      evidence: {
        hostCount: hosts.length,
        hardwareRowCount: hardware.length,
        softwareRowCount: software.length,
        pollHint: 'Inventory data refreshes about hourly',
        checkedAt,
      },
    });

    for (const [index, host] of hosts.entries()) {
      const hid = hidOf(host, `host-${index}`);
      const name = pickString(host, ['computerName', 'ComputerName', 'name', 'hostName']) ?? hid;
      const hw = hwByHid.get(hid) ?? [];
      const sw = swByHid.get(hid) ?? [];
      ctx.pass({
        title: `Inventory: ${name}`,
        description: `Host joined with ${hw.length} hardware row(s) and ${sw.length} software row(s).`,
        resourceType: 'device',
        resourceId: hid,
        evidence: {
          hid,
          host,
          hardware: hw,
          software: sw.slice(0, 200),
          softwareTruncated: sw.length > 200,
          checkedAt,
        },
      });
    }
  },
};
