'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';
import type { BrowserAutomationDraft, DraftStep } from './types';

interface DraftPayload {
  name?: string;
  steps: DraftStep[];
}

/**
 * In-progress (unsaved) automations for a task, persisted server-side so a draft
 * survives refreshes and follows the user across devices.
 */
export function useBrowserAutomationDrafts({ taskId }: { taskId: string }) {
  const [drafts, setDrafts] = useState<BrowserAutomationDraft[]>([]);

  const fetchDrafts = useCallback(async () => {
    const res = await apiClient.get<BrowserAutomationDraft[]>(
      `/v1/browserbase/automations/task/${taskId}/drafts`,
    );
    setDrafts(Array.isArray(res.data) ? res.data : []);
  }, [taskId]);

  useEffect(() => {
    void fetchDrafts();
  }, [fetchDrafts]);

  const createDraft = useCallback(
    async (payload: DraftPayload): Promise<BrowserAutomationDraft | null> => {
      const res = await apiClient.post<BrowserAutomationDraft>(
        '/v1/browserbase/automation-drafts',
        { taskId, ...payload },
      );
      return res.data ?? null;
    },
    [taskId],
  );

  const updateDraft = useCallback(
    async (draftId: string, payload: Partial<DraftPayload>) => {
      await apiClient.patch(`/v1/browserbase/automation-drafts/${draftId}`, payload);
    },
    [],
  );

  const deleteDraft = useCallback(async (draftId: string) => {
    await apiClient.delete(`/v1/browserbase/automation-drafts/${draftId}`);
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
  }, []);

  return { drafts, fetchDrafts, createDraft, updateDraft, deleteDraft };
}
