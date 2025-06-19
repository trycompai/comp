'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import '@comp/ui/editor.css';
import type { JSONContent } from '@tiptap/react';
import { updatePolicy } from '../actions/update-policy';

const removeUnsupportedMarks = (node: JSONContent): JSONContent => {
  if (node.marks) {
    node.marks = node.marks.filter((mark) => mark.type !== 'textStyle');
  }

  if (node.content) {
    node.content = node.content.map(removeUnsupportedMarks);
  }

  return node;
};

interface PolicyDetailsProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
}

export function PolicyPageEditor({
  policyId,
  policyContent,
  isPendingApproval,
}: PolicyDetailsProps) {
  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : typeof policyContent === 'object' && policyContent !== null
      ? [policyContent as JSONContent]
      : [];
  const sanitizedContent = formattedContent.map(removeUnsupportedMarks);
  const handleSavePolicy = async (policyContent: JSONContent[]): Promise<void> => {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, content: policyContent });
    } catch (error) {
      console.error('Error saving policy:', error);
      throw error;
    }
  };

  return (
    <div className="flex h-full flex-col border">
      <PolicyEditor
        content={sanitizedContent}
        onSave={handleSavePolicy}
        readOnly={isPendingApproval}
      />
    </div>
  );
}
