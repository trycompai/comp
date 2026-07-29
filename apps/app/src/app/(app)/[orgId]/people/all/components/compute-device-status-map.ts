import type { DeviceWithChecks, Host } from '../../devices/types';

export type MemberDeviceStatus = 'compliant' | 'non-compliant' | 'stale' | 'not-installed';

/**
 * One row per physical machine, newest `installedAt` wins.
 *
 * A machine can end up with more than one Device row — a serial read that failed
 * once, a `fallback:` serial, an integration row the agent adopted — and only the
 * newest of them keeps receiving check-ins, so the older ones freeze and turn
 * stale. Rolling those up worst-wins is what made People read "Missing" for a
 * machine the employee's Device tab read as compliant: that page takes the newest
 * `installedAt` agent row, so both views have to pick the same row to agree.
 */
function newestPerMachine(devices: DeviceWithChecks[]): DeviceWithChecks[] {
  const byMachine = new Map<string, DeviceWithChecks>();
  for (const d of devices) {
    const key = `${d.memberId ?? ''}:${d.hostname.toLowerCase()}`;
    const prev = byMachine.get(key);
    if (!prev || new Date(d.installedAt) > new Date(prev.installedAt)) {
      byMachine.set(key, d);
    }
  }
  return [...byMachine.values()];
}

/**
 * Roll-up per-member device compliance for the People table.
 *
 * Rules (in order of precedence):
 * 1. Every member in `complianceMemberIds` starts as `not-installed`.
 * 2. For each machine (see `newestPerMachine`) with a memberId in the set, the
 *    member's roll-up is
 *    `non-compliant` > `stale` > `compliant`:
 *      - Any device with `complianceStatus === 'non_compliant'` → member is
 *        `'non-compliant'`.
 *      - Else any device with `complianceStatus === 'stale'` → member is
 *        `'stale'`.
 *      - Else (all devices compliant) → `'compliant'`.
 * 3. If a member has no agent device but has a Fleet host, we fall back to
 *    Fleet policy status (compliant / non-compliant; Fleet has no stale
 *    concept). Agent data always wins when present.
 */
export function computeDeviceStatusMap({
  agentDevices,
  fleetHosts,
  complianceMemberIds,
}: {
  agentDevices: DeviceWithChecks[];
  fleetHosts: Host[];
  complianceMemberIds: string[];
}): Record<string, MemberDeviceStatus> {
  const map: Record<string, MemberDeviceStatus> = {};
  const complianceSet = new Set(complianceMemberIds);
  for (const id of complianceSet) {
    map[id] = 'not-installed';
  }

  const agentRollup = new Map<string, MemberDeviceStatus>();
  // Integration-imported devices carry no compliance data, so they must not set
  // a member's status (it would falsely read non-compliant/stale) nor suppress
  // the richer Fleet fallback below. Only true agent devices count — and they are
  // filtered before the dedupe so an imported row never shadows the agent row for
  // the same machine.
  const agentRows = agentDevices.filter((d) => d.source === 'device_agent');
  for (const d of newestPerMachine(agentRows)) {
    if (!d.memberId || !complianceSet.has(d.memberId)) continue;

    const prev = agentRollup.get(d.memberId);
    // Once a member has a non-compliant device, nothing can downgrade it.
    if (prev === 'non-compliant') continue;

    if (d.complianceStatus === 'non_compliant') {
      agentRollup.set(d.memberId, 'non-compliant');
      continue;
    }
    if (d.complianceStatus === 'stale') {
      // Stale wins over compliant but loses to non-compliant.
      if (prev !== 'stale') agentRollup.set(d.memberId, 'stale');
      continue;
    }
    // complianceStatus === 'compliant' (or any other benign value).
    if (prev === undefined) agentRollup.set(d.memberId, 'compliant');
  }
  for (const [memberId, status] of agentRollup) {
    map[memberId] = status;
  }

  for (const host of fleetHosts) {
    if (!host.member_id || !complianceSet.has(host.member_id)) continue;
    if (agentRollup.has(host.member_id)) continue;
    // Non-compliant wins across multiple Fleet hosts for the same member —
    // once we've seen a failing host, a later passing host must not clobber it.
    if (map[host.member_id] === 'non-compliant') continue;
    const isCompliant = host.policies.every((p) => p.response === 'pass');
    map[host.member_id] = isCompliant ? 'compliant' : 'non-compliant';
  }

  return map;
}
