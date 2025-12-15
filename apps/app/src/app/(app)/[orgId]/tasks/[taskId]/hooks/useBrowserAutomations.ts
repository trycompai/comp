'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { BrowserAutomation } from './types';

interface UseBrowserAutomationsOptions {
  taskId: string;
  organizationId: string;
}

interface AutomationConfigInput {
  name: string;
  targetUrl: string;
  instruction: string;
}

export function useBrowserAutomations({ taskId, organizationId }: UseBrowserAutomationsOptions) {
  const [automations, setAutomations] = useState<BrowserAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await apiClient.get<BrowserAutomation[]>(
        `/v1/browserbase/automations/task/${taskId}`,
        organizationId,
      );
      if (res.data) {
        setAutomations(res.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [taskId, organizationId]);

  const createAutomation = useCallback(
    async (input: AutomationConfigInput) => {
      setIsSaving(true);
      try {
        const res = await apiClient.post<BrowserAutomation>(
          '/v1/browserbase/automations',
          { taskId, ...input },
          organizationId,
        );
        if (res.error) throw new Error(res.error);

        toast.success('Browser automation created');
        await fetchAutomations();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create automation');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [taskId, organizationId, fetchAutomations],
  );

  const updateAutomation = useCallback(
    async ({
      automationId,
      input,
    }: {
      automationId: string;
      input: AutomationConfigInput;
    }) => {
      setIsSaving(true);
      try {
        const res = await apiClient.patch<BrowserAutomation>(
          `/v1/browserbase/automations/${automationId}`,
          input,
          organizationId,
        );
        if (res.error) throw new Error(res.error);

        toast.success('Browser automation updated');
        await fetchAutomations();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update automation');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [organizationId, fetchAutomations],
  );

  return {
    automations,
    isLoading,
    isSaving,
    fetchAutomations,
    createAutomation,
    updateAutomation,
  };
}
