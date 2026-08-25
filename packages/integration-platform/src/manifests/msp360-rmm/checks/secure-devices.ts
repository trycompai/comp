import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { fetchAllStat, hidOf, hostName, indexByHid, pickString, rmmToken, truthyFlag } from '../client';
import type { RmmRecord } from '../types';

const AV_ENABLED_KEYS = [
  'enabled',
  'Enabled',
  'isEnabled',
  'active',
  'Active',
  'realTimeProtection',
  'RealTimeProtection',
  'isActive',
  'status',
  'Status',
  'state',
  'State',
  'productStatus',
];

const ENCRYPTION_KEYS = [
  'bitlocker',
  'BitLocker',
  'filevault',
  'FileVault',
  'encryption',
  'Encryption',
  'diskEncryption',
  'volumeEncryption',
  'isEncrypted',
  'encrypted',
];

const SCREEN_LOCK_KEYS = ['screenLock', 'ScreenLock', 'lockScreen', 'screensaver', 'screenSaver'];

const UNIX_OS_RE = /\b(linux|debian|ubuntu|unix|freebsd|centos|rhel|fedora)\b/i;
const WINDOWS_OS_RE = /\b(windows|winnt|win32)\b/i;

function isUnixHost(host: RmmRecord): boolean {
  const blob = [
    host.osName,
    host.osType,
    host.operationSystemID,
    host.platformID,
    host.os,
    host.OS,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ');
  if (WINDOWS_OS_RE.test(blob) && !UNIX_OS_RE.test(blob)) {
    return false;
  }
  return UNIX_OS_RE.test(blob);
}

function antivirusMetric(row: RmmRecord): RmmRecord | null {
  const nested = row.antivirus;
  return nested && typeof nested === 'object' && !Array.isArray(nested) ? (nested as RmmRecord) : null;
}

function antivirusActive(rows: RmmRecord[]): { active: boolean; reason: string; sample: RmmRecord | null } {
  if (rows.length === 0) {
    return { active: false, reason: 'No antivirus inventory row for this hid', sample: null };
  }
  for (const row of rows) {
    const flag = truthyFlag(row, AV_ENABLED_KEYS);
    if (flag === true) {
      return { active: true, reason: 'Antivirus reported enabled/active', sample: row };
    }
    if (flag === false) {
      continue;
    }
    const nested = antivirusMetric(row);
    if (nested) {
      const nestedFlag = truthyFlag(nested, AV_ENABLED_KEYS);
      if (nestedFlag === true) {
        return { active: true, reason: 'Summary antivirus metric reported OK/enabled', sample: row };
      }
    }
    const product = pickString(row, ['productName', 'ProductName', 'displayName']);
    if (product) {
      return { active: true, reason: `Antivirus product present (${product}); explicit enabled flag not set`, sample: row };
    }
  }
  const disabled = rows.some((row) => truthyFlag(row, AV_ENABLED_KEYS) === false);
  return {
    active: false,
    reason: disabled ? 'Antivirus present but disabled' : 'Could not determine an active antivirus product',
    sample: rows[0] ?? null,
  };
}

function firstPresent(rows: RmmRecord[], keys: string[]): unknown {
  for (const row of rows) {
    for (const key of keys) {
      if (key in row && row[key] != null && row[key] !== '') {
        return row[key];
      }
    }
  }
  return undefined;
}

export const secureDevicesCheck: IntegrationCheck = {
  id: 'secure-devices',
  name: 'MSP360 RMM secure devices',
  description:
    'Antivirus from RMM antivirus/summary stats. BitLocker/FileVault and screen lock are marked unverified unless the API actually returns those fields.',
  service: 'security',
  taskMapping: TASK_TEMPLATES.secureDevices,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 RMM secure-devices check');
    if (!rmmToken(ctx)) {
      ctx.fail({
        title: 'Missing MSP360 RMM API token',
        description: 'Secure-devices evidence needs the RMM Bearer token.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm',
        severity: 'high',
        remediation: 'Paste an RMM API token (not Backup Provider Login) and reconnect.',
      });
      return;
    }

    let hosts: RmmRecord[];
    let avRows: RmmRecord[] = [];
    let summaries: RmmRecord[] = [];
    try {
      hosts = await fetchAllStat(ctx, 'host');
      avRows = await fetchAllStat(ctx, 'antivirus');
      summaries = await fetchAllStat(ctx, 'summary');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to fetch MSP360 RMM security inventory',
        description: 'Host/antivirus/summary fleet endpoints failed.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-secure',
        severity: 'high',
        remediation: 'Confirm the RMM token can read computer stats.',
        evidence: { error: message },
      });
      return;
    }

    if (hosts.length === 0) {
      ctx.fail({
        title: 'No RMM hosts to evaluate for secure devices',
        description: 'Host inventory was empty.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-secure',
        severity: 'medium',
        remediation: 'Install RMM agents or use a token that can see the fleet.',
      });
      return;
    }

    const avByHid = indexByHid(avRows);
    const summaryByHid = indexByHid(summaries);
    const checkedAt = new Date().toISOString();
    let encryptionFieldSeen = false;
    let screenLockFieldSeen = false;

    for (const [index, host] of hosts.entries()) {
      const hid = hidOf(host, `host-${index}`);
      const name = hostName(host, hid);
      const avForHost = [...(avByHid.get(hid) ?? []), ...(summaryByHid.get(hid) ?? [])];
      const av = antivirusActive(avForHost);
      const encryption = firstPresent(avForHost, ENCRYPTION_KEYS) ?? firstPresent([host], ENCRYPTION_KEYS);
      const screenLock = firstPresent(avForHost, SCREEN_LOCK_KEYS) ?? firstPresent([host], SCREEN_LOCK_KEYS);
      if (encryption !== undefined) encryptionFieldSeen = true;
      if (screenLock !== undefined) screenLockFieldSeen = true;

      const encryptionOff = encryption !== undefined && truthyFlag({ v: encryption }, ['v']) === false;
      const screenLockOff = screenLock !== undefined && truthyFlag({ v: screenLock }, ['v']) === false;

      const evidence = {
        hid,
        name,
        antivirusActive: av.active,
        antivirusReason: av.reason,
        antivirusSample: av.sample,
        encryptionField: encryption ?? null,
        screenLockField: screenLock ?? null,
        checkedAt,
      };

      // Field present and off → fail before AV N/A, so Linux does not skip an explicit encryption-off.
      if (encryptionOff) {
        ctx.fail({
          title: `Disk encryption reported off: ${name}`,
          description: 'RMM returned an encryption field that is not enabled.',
          resourceType: 'device',
          resourceId: hid,
          severity: 'high',
          remediation:
            'Enable BitLocker or FileVault on the device. Comp AI Device Agent is still required for laptop encryption evidence if RMM does not cover it.',
          evidence,
        });
        continue;
      }

      if (screenLockOff) {
        ctx.fail({
          title: `Screen lock reported off: ${name}`,
          description: 'RMM returned a screen-lock field that is not enabled.',
          resourceType: 'device',
          resourceId: hid,
          severity: 'medium',
          remediation: 'Enable screen lock / screensaver lock on this endpoint, then re-run.',
          evidence,
        });
        continue;
      }

      if (!av.active) {
        if (isUnixHost(host)) {
          ctx.pass({
            title: `Antivirus not applicable on Unix/Linux: ${name}`,
            description:
              'This host looks like Linux/Unix. MSP360 RMM antivirus inventory is a Windows-oriented control here, so missing AV is not scored as a fail.',
            resourceType: 'device',
            resourceId: hid,
            evidence: { ...evidence, outcome: 'av-not-applicable-unix' },
          });
          continue;
        }
        ctx.fail({
          title: `Antivirus missing or disabled: ${name}`,
          description: av.reason,
          resourceType: 'device',
          resourceId: hid,
          severity: 'high',
          remediation: 'Install or enable antivirus on this endpoint via MSP360 RMM, then re-run.',
          evidence,
        });
        continue;
      }

      ctx.pass({
        title: `Antivirus active: ${name}`,
        description:
          encryption === undefined && screenLock === undefined
            ? `${av.reason}. Disk encryption and screen lock were not present on this RMM record (not treated as a pass for those controls).`
            : av.reason,
        resourceType: 'device',
        resourceId: hid,
        evidence,
      });
    }

    if (!encryptionFieldSeen || !screenLockFieldSeen) {
      ctx.pass({
        title: 'RMM cannot fully verify encryption / screen lock',
        description:
          'Comp AI secure-devices text asks for BitLocker/FileVault and screen lock. MSP360 RMM fleet stats did not expose those fields on this connection. This is an honest gap — not a fake pass. Use Comp AI Device Agent for laptop encryption evidence.',
        resourceType: 'control',
        resourceId: 'msp360-rmm-unverified-encryption-screenlock',
        evidence: {
          encryptionFieldSeen,
          screenLockFieldSeen,
          note: 'Do not treat this row as proof that disks are encrypted or that screen lock is enforced.',
          checkedAt,
        },
      });
    }
  },
};
