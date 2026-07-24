'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/** Edit / remove a connection (browser auth profile). */
export function useConnectionActions(onChanged?: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const editConnection = useCallback(
    async (
      profileId: string,
      data: { displayName?: string; url?: string },
    ): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await apiClient.patch(
          `/v1/browserbase/profiles/${profileId}`,
          data,
        );
        if (res.error) {
          toast.error(res.error);
          return false;
        }
        toast.success('Connection updated');
        onChanged?.();
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [onChanged],
  );

  const removeConnection = useCallback(
    async (profileId: string): Promise<boolean> => {
      setIsRemoving(true);
      try {
        const res = await apiClient.delete(
          `/v1/browserbase/profiles/${profileId}`,
        );
        if (res.error) {
          toast.error(res.error);
          return false;
        }
        toast.success('Connection removed');
        onChanged?.();
        return true;
      } finally {
        setIsRemoving(false);
      }
    },
    [onChanged],
  );

  return { editConnection, removeConnection, isSaving, isRemoving };
}
