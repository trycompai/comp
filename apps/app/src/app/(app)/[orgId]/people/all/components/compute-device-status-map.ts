import type { DeviceWithChecks, Host } from '../../devices/types';

export type MemberDeviceStatus = 'compliant' | 'non-compliant' | 'not-installed';

/**
 * Roll-up per-member device compliance for the People table.
 *
 * Rules (in order):
 * 1. Every member in `complianceMemberIds` starts as `not-installed`.
 * 2. For each agent device with a memberId in the set, ALL of that member's
 *    devices must have `complianceStatus === 'compliant'` to roll up to
 *    `compliant`. `non_compliant` and `stale` both count as non-compliant.
 * 3. If a member has no agent device but has a Fleet host, we fall back to
 *    Fleet policy status. Agent data always wins when present.
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

  const agentComplianceByMember = new Map<string, boolean>();
  for (const d of agentDevices) {
    if (!d.memberId || !complianceSet.has(d.memberId)) continue;
    const prev = agentComplianceByMember.get(d.memberId);
    // Stale devices count as non-compliant for the roll-up.
    const isCompliant = d.complianceStatus === 'compliant';
    agentComplianceByMember.set(d.memberId, (prev ?? true) && isCompliant);
  }
  for (const [memberId, allCompliant] of agentComplianceByMember) {
    map[memberId] = allCompliant ? 'compliant' : 'non-compliant';
  }

  for (const host of fleetHosts) {
    if (!host.member_id || !complianceSet.has(host.member_id)) continue;
    if (agentComplianceByMember.has(host.member_id)) continue;
    const isCompliant = host.policies.every((p) => p.response === 'pass');
    if (map[host.member_id] !== 'non-compliant') {
      map[host.member_id] = isCompliant ? 'compliant' : 'non-compliant';
    }
  }

  return map;
}
