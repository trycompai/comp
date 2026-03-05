import { apiClient } from '@/lib/api-client';
import type { Risk, Impact, Likelihood } from '@db';
import { useSWRConfig } from 'swr';

interface UpdateRiskPayload {
  residualLikelihood?: Likelihood;
  residualImpact?: Impact;
  likelihood?: Likelihood;
  impact?: Impact;
  title?: string;
  description?: string;
  assigneeId?: string | null;
}

function isRiskCacheKey(key: unknown): boolean {
  if (Array.isArray(key) && typeof key[0] === 'string') {
    return key[0].includes('/v1/risks');
  }
  if (typeof key === 'string') {
    return key.includes('/v1/risks');
  }
  return false;
}

/**
 * Lightweight hook for risk mutations with global SWR cache invalidation.
 * Use this in components outside the main risks page (e.g., vendor residual risk forms)
 * where importing the full `useRisks` hook is not appropriate.
 */
export function useRiskMutations() {
  const { mutate: globalMutate } = useSWRConfig();

  const invalidateRiskCaches = async () => {
    await globalMutate(isRiskCacheKey, undefined, { revalidate: true });
  };

  const updateRisk = async (
    riskId: string,
    data: UpdateRiskPayload,
  ): Promise<void> => {
    const response = await apiClient.patch<Risk>(
      `/v1/risks/${riskId}`,
      data,
    );
    if (response.error) throw new Error(response.error);
    await invalidateRiskCaches();
  };

  return {
    updateRisk,
  };
}
