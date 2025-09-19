'use client';

import { useEffect } from 'react';
import { useSandboxStore } from './state';

interface Props {
  orgId: string;
  taskId: string;
}

export function Initializer({ orgId, taskId }: Props) {
  const { sandboxId, addPaths, setSandboxId } = useSandboxStore();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        // Ensure sandbox exists
        let id = sandboxId;
        if (!id) {
          const created = await fetch('/api/tasks-automations/sandboxes', { method: 'POST' }).then(
            (r) => r.json(),
          );
          id = created.sandboxId as string;
          setSandboxId(id);
        }

        // Fetch function content from S3
        const res = await fetch(
          `/api/tasks-automations/lambda/functions?orgId=${encodeURIComponent(orgId)}&taskId=${encodeURIComponent(taskId)}&t=${Date.now()}`,
          { cache: 'no-store' },
        );
        const json = await res.json();
        const content: string | undefined = json?.content;

        // Debug log to check what's being fetched
        console.log(`[Initializer] Fetched content for ${orgId}/${taskId}:`, {
          hasContent: !!content,
          contentLength: content?.length,
          firstLine: content?.split('\n')[0],
        });

        // Write into sandbox
        if (content && id) {
          const path = `lambdas/${taskId}.js`;
          await fetch(`/api/tasks-automations/sandboxes/${encodeURIComponent(id)}/files`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path, content }),
          });
          if (!cancelled) {
            addPaths([`/${path}`]);
            console.log('[Initializer] Added path to store:', `/${path}`);
          }
        }
      } catch (error) {
        console.error('[Initializer] Error:', error);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [sandboxId, addPaths, setSandboxId, orgId, taskId]);

  return null;
}
