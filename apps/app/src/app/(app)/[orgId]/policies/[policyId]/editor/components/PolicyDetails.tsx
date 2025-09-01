'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import { validateAndFixTipTapContent } from '@comp/ui/editor';
import '@comp/ui/editor.css';
import type { PolicyDisplayFormat } from '@db';
import type { JSONContent } from '@tiptap/react';
import { PdfViewer } from '../../components/PdfViewer';
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

interface PolicyContentDisplayProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
  displayFormat?: PolicyDisplayFormat;
  pdfUrl?: string | null;
}

export function PolicyContentDisplay({
  policyId,
  policyContent,
  isPendingApproval,
  displayFormat,
  pdfUrl,
}: PolicyContentDisplayProps) {
  // Conditionally render the PDF viewer or the editor based on the policy's display format.
  if (displayFormat === 'PDF') {
    return <PdfViewer policyId={policyId} pdfUrl={pdfUrl} isPendingApproval={isPendingApproval} />;
  }

  // Default to the rich text editor.
  const formattedContent = Array.isArray(policyContent) ? policyContent : [policyContent as JSONContent];
  const sanitizedContent = formattedContent.map(removeUnsupportedMarks);
  const validatedDoc = validateAndFixTipTapContent(sanitizedContent);
  const normalizedContent = (validatedDoc.content || []) as JSONContent[];

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
    <div className="flex h-full flex-col border border-border rounded-md p-2">
      <PolicyEditor
        content={normalizedContent}
        onSave={handleSavePolicy}
        readOnly={isPendingApproval}
      />
    </div>
  );
}
