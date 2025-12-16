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
  fleetDmLabelId: number | null;
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

  return {
    unlinkDevice,
  };
}
