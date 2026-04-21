import type { DeviceWithChecks, Host } from '../../devices/types';

export type MemberDeviceStatus = 'compliant' | 'non-compliant' | 'stale' | 'not-installed';

/**
 * Roll-up per-member device compliance for the People table.
 *
 * Rules (in order of precedence):
 * 1. Every member in `complianceMemberIds` starts as `not-installed`.
 * 2. For each agent device with a memberId in the set, the member's roll-up is
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
  for (const d of agentDevices) {
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
