import { DescribeSecurityGroupsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { assumeAwsSession, type CheckOutcome, emitOutcomes } from './shared';

export interface SgPermission {
  ipProtocol: string;
  fromPort?: number;
  toPort?: number;
  cidrs: string[];
}

export interface SgInfo {
  groupId: string;
  groupName?: string;
  region: string;
  permissions: SgPermission[];
}

const SENSITIVE_PORTS: Array<{ port: number; label: string; severity: FindingSeverity }> = [
  { port: 3389, label: 'RDP', severity: 'critical' },
  { port: 22, label: 'SSH', severity: 'high' },
];

function permCoversPort(perm: SgPermission, target: number): boolean {
  if (perm.fromPort === undefined || perm.toPort === undefined) return false;
  return target >= perm.fromPort && target <= perm.toPort;
}

export function evaluateSecurityGroups(sgs: SgInfo[]): CheckOutcome[] {
  const out: CheckOutcome[] = [];
  for (const sg of sgs) {
    let bad = false;
    for (const perm of sg.permissions) {
      if (!perm.cidrs.includes('0.0.0.0/0') && !perm.cidrs.includes('::/0')) continue;
      if (perm.ipProtocol === '-1') {
        bad = true;
        out.push({
          kind: 'fail',
          title: `Security group open to internet (all ports): ${sg.groupId}`,
          description: `Security group "${sg.groupName ?? sg.groupId}" (${sg.region}) allows all traffic from 0.0.0.0/0.`,
          resourceType: 'aws-security-group',
          resourceId: sg.groupId,
          severity: 'critical',
          remediation: 'Restrict the inbound rule to specific CIDRs and ports.',
          evidence: { groupId: sg.groupId, region: sg.region },
        });
        continue;
      }
      // SSH/RDP findings only apply to TCP rules. A non-TCP rule (udp/icmp) on
      // port 22/3389 must not be misclassified as SSH/RDP. The all-protocols
      // ('-1') case is handled above as critical.
      if (perm.ipProtocol !== 'tcp' && perm.ipProtocol !== '6') continue;
      for (const { port, label, severity } of SENSITIVE_PORTS) {
        if (permCoversPort(perm, port)) {
          bad = true;
          out.push({
            kind: 'fail',
            title: `${label} open to internet: ${sg.groupId}`,
            description: `Security group "${sg.groupName ?? sg.groupId}" (${sg.region}) allows ${label} (port ${port}) from 0.0.0.0/0.`,
            resourceType: 'aws-security-group',
            resourceId: sg.groupId,
            severity,
            remediation: `Remove the 0.0.0.0/0 rule for port ${port}; restrict ${label} to a VPN, bastion, or known CIDRs.`,
            evidence: { groupId: sg.groupId, region: sg.region, port },
          });
        }
      }
    }
    if (!bad) {
      out.push({
        kind: 'pass',
        title: `No internet-open sensitive ports: ${sg.groupId}`,
        description: `Security group "${sg.groupName ?? sg.groupId}" (${sg.region}) does not expose SSH/RDP/all-ports to 0.0.0.0/0.`,
        resourceType: 'aws-security-group',
        resourceId: sg.groupId,
        evidence: { groupId: sg.groupId, region: sg.region },
      });
    }
  }
  return out;
}

export const ec2SecurityGroupsCheck: IntegrationCheck = {
  id: 'aws-ec2-security-groups',
  name: 'EC2 — no security groups open to the internet',
  description:
    'Flags security group inbound rules that allow SSH, RDP, or all traffic from 0.0.0.0/0.',
  service: 'ec2-vpc',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS EC2 security-groups check: connection not configured — skipping');
      return;
    }
    const sgs: SgInfo[] = [];
    for (const region of session.regions) {
      // Isolate per-region failures (opted-out/disabled regions, throttling)
      // so one region's error doesn't abort scanning of the others.
      try {
        const ec2 = new EC2Client({ region, credentials: session.credentials });
        let token: string | undefined;
        do {
          const resp = await ec2.send(
            new DescribeSecurityGroupsCommand({ NextToken: token, MaxResults: 1000 }),
          );
          for (const sg of resp.SecurityGroups ?? []) {
            sgs.push({
              groupId: sg.GroupId ?? 'unknown',
              groupName: sg.GroupName,
              region,
              permissions: (sg.IpPermissions ?? []).map((p) => ({
                ipProtocol: p.IpProtocol ?? '-1',
                fromPort: p.FromPort,
                toPort: p.ToPort,
                cidrs: [
                  ...(p.IpRanges ?? []).map((r) => r.CidrIp),
                  ...(p.Ipv6Ranges ?? []).map((r) => r.CidrIpv6),
                ].filter((c): c is string => typeof c === 'string'),
              })),
            });
          }
          token = resp.NextToken;
        } while (token);
      } catch (err) {
        ctx.log(
          `EC2: could not list security groups in ${region}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (sgs.length === 0) return;
    emitOutcomes(ctx, evaluateSecurityGroups(sgs));
  },
};
