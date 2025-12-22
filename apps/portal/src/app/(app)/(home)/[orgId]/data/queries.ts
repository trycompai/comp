import { serverApi } from '@/lib/server-api-client';
import { z } from 'zod';
import {
  EmployeePortalDashboardSchema,
  HostSchema,
  MemberSchema,
  PolicySchema,
  TrainingVideoCompletionSchema,
  type EmployeePortalDashboard,
} from '../types/employee-portal';

export async function getEmployeePortalOverview(
  organizationId: string,
): Promise<EmployeePortalDashboard> {
  const memberRes = await serverApi.get<unknown>('/v1/people/me', organizationId);
  if (memberRes.error) throw new Error(memberRes.error);
  if (!memberRes.data) throw new Error('No member returned');

  const member = MemberSchema.parse(memberRes.data);

  const policiesRes = await serverApi.get<unknown>('/v1/policies', organizationId);
  if (policiesRes.error) throw new Error(policiesRes.error);

  const trainingRes = await serverApi.get<unknown>('/v1/people/me/training-videos', organizationId);
  if (trainingRes.error) throw new Error(trainingRes.error);

  const policiesWrapper = z
    .object({ data: z.array(PolicySchema) })
    .passthrough()
    .parse(policiesRes.data ?? { data: [] });

  const trainingVideos = z.array(TrainingVideoCompletionSchema).parse(trainingRes.data ?? []);

  // Devices are optional (org/member may not have Fleet configured) — don't hard-fail.
  const devicesRes = await serverApi.get<unknown>(
    `/v1/devices/member/${member.id}`,
    organizationId,
  );
  const devicesWrapper = z
    .object({ data: z.array(z.unknown()) })
    .passthrough()
    .parse(devicesRes.data ?? { data: [] });

  const host = devicesWrapper.data.length > 0 ? HostSchema.parse(devicesWrapper.data[0]) : null;
  const fleetPolicies = host?.policies ?? [];

  const dashboardCandidate = {
    member,
    policies: policiesWrapper.data.filter(
      (p) => p.status === 'published' && p.isRequiredToSign === true,
    ),
    trainingVideos,
    host,
    fleetPolicies,
  };

  return EmployeePortalDashboardSchema.parse(dashboardCandidate);
}
