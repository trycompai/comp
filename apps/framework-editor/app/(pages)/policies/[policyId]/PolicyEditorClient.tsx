'use client';

import { PolicyEditor } from '@/app/components/editor/PolicyEditor'; // Use PolicyEditor from framework-editor
import type { JSONContent } from '@tiptap/react';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/api-client';

interface PolicyEditorClientProps {
  policyId: string;
  policyName: string; // For display purposes
  initialContent: JSONContent | JSONContent[] | null | undefined; // From DB
}

export function PolicyEditorClient({
  policyId,
  policyName,
  initialContent,
}: PolicyEditorClientProps) {
  const handleSavePolicy = async (contentToSave: JSONContent): Promise<void> => {
    if (!policyId) return;

    const serializableContent = JSON.parse(JSON.stringify(contentToSave));

    try {
      await apiClient(`/policy-template/${policyId}/content`, {
        method: 'PATCH',
        body: JSON.stringify({ content: serializableContent }),
      });
      toast.success('Policy content saved!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save policy content.';
      toast.error(message);
      throw error;
    }
  };

  return <PolicyEditor initialDbContent={initialContent} onSave={handleSavePolicy} />;
}
