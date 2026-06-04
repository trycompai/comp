'use client';

import { useApi } from '@/hooks/use-api';
import { useCallback } from 'react';

export interface PeopleResponseDto {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string; // ISO string from API
  department: string;
  isActive: boolean;
  deactivated: boolean;
  fleetDmLabelId: number | null;
  onboardDate: string | null;
  offboardDate: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string; // ISO string from API
    updatedAt: string; // ISO string from API
    lastLogin: string | null; // ISO string from API
  };
}

/**
 * Hook for people/member actions
 */
export function usePeopleActions() {
  const api = useApi();

  const unlinkDevice = useCallback(
    async (memberId: string) => {
      const response = await api.patch<PeopleResponseDto>(
        `/v1/people/${memberId}/unlink-device`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const removeMember = useCallback(
    async (memberId: string, options?: { skipOffboarding?: boolean }) => {
      const query = options?.skipOffboarding ? '?skipOffboarding=true' : '';
      const response = await api.delete<{
        success: boolean;
        deletedMember: { id: string; name: string; email: string };
      }>(`/v1/people/${memberId}${query}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const removeHostFromFleet = useCallback(
    async (memberId: string, hostId: number) => {
      const response = await api.delete<{ success: boolean }>(
        `/v1/people/${memberId}/host/${hostId}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const removeDeviceAgent = useCallback(
    async (deviceId: string) => {
      const response = await api.delete<{
        success?: boolean;
      }>(`/v1/devices/${deviceId}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    [api],
  );

  const reactivateMember = useCallback(
    async (memberId: string) => {
      const response = await api.patch<PeopleResponseDto>(
        `/v1/people/${memberId}/reactivate`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  const resendPortalInvite = useCallback(
    async (memberId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/v1/people/${memberId}/resend-portal-invite`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    },
    [api],
  );

  return {
    unlinkDevice,
    removeMember,
    removeHostFromFleet,
    removeDeviceAgent,
    reactivateMember,
    resendPortalInvite,
  };
}
