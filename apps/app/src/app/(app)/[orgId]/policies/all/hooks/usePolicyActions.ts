'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

export function usePolicyActions() {
  const regenerateAll = useCallback(async () => {
    const response = await apiClient.post('/v1/policies/regenerate-all');
    if (response.error) throw new Error(response.error);
    return response;
  }, []);

  return { regenerateAll };
}
