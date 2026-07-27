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
    // apiClient resolves (doesn't throw) on error — don't mask a failed fetch as
    // "no drafts"; keep whatever we already have.
    if (res.error) return;
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
    async (
      draftId: string,
      payload: Partial<DraftPayload>,
    ): Promise<boolean> => {
      const res = await apiClient.patch(
        `/v1/browserbase/automation-drafts/${draftId}`,
        payload,
      );
      // Report whether the autosave actually persisted instead of assuming it did.
      return !res.error;
    },
    [],
  );

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    const res = await apiClient.delete(
      `/v1/browserbase/automation-drafts/${draftId}`,
    );
    // Only drop it locally once the server confirms — a failed delete must not
    // make a draft look discarded while it still exists on the server.
    if (res.error) return false;
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    return true;
  }, []);

  return { drafts, fetchDrafts, createDraft, updateDraft, deleteDraft };
}
