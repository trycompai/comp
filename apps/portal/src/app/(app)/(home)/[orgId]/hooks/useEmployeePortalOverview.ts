'use client';

import { apiClient, type ApiResponse } from '@/lib/api-client';
import useSWR from 'swr';
import { z } from 'zod';
import {
  EmployeePortalDashboardSchema,
  HostSchema,
  MemberSchema,
  PolicySchema,
  TrainingVideoCompletionSchema,
  type EmployeePortalDashboard,
} from '../types/employee-portal';

export const employeePortalOverviewKey = (organizationId: string) =>
  ['employee-portal-overview', organizationId] as const;

export function useEmployeePortalOverview({
  organizationId,
  initialDashboard,
}: {
  organizationId: string;
  initialDashboard?: EmployeePortalDashboard;
}) {
  return useSWR<ApiResponse<EmployeePortalDashboard>>(
    employeePortalOverviewKey(organizationId),
    async ([, orgId]) => {
      const organizationId = String(orgId);
      const memberRes = await apiClient.get('/v1/people/me', organizationId);
      if (memberRes.error) return { status: memberRes.status, error: memberRes.error };
      if (!memberRes.data) return { status: memberRes.status, error: 'No member returned' };

      const member = MemberSchema.parse(memberRes.data);

      const [policiesRes, trainingRes, devicesRes] = await Promise.all([
        apiClient.get('/v1/policies', organizationId),
        apiClient.get('/v1/people/me/training-videos', organizationId),
        apiClient.get(`/v1/devices/member/${member.id}`, organizationId),
      ]);

      if (policiesRes.error) return { status: policiesRes.status, error: policiesRes.error };
      if (trainingRes.error) return { status: trainingRes.status, error: trainingRes.error };

      const policiesWrapper = z
        .object({ data: z.array(PolicySchema) })
        .passthrough()
        .parse(policiesRes.data ?? { data: [] });

      const trainingVideos = z.array(TrainingVideoCompletionSchema).parse(trainingRes.data ?? []);

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

      return {
        status: 200,
        data: EmployeePortalDashboardSchema.parse(dashboardCandidate),
      };
    },
    {
      fallbackData: initialDashboard ? { status: 200, data: initialDashboard } : undefined,
      revalidateOnFocus: false,
    },
  );
}
