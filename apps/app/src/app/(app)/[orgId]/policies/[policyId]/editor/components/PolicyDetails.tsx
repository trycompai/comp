'use client';

import { PolicyEditor } from '@/components/editor/policy-editor';
import type { PolicyDisplayFormat } from '@/lib/db';
import { Card, CardContent } from '@comp/ui/card';
import { validateAndFixTipTapContent } from '@comp/ui/editor';
import '@comp/ui/editor.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import type { JSONContent } from '@tiptap/react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { switchPolicyDisplayFormatAction } from '../../actions/switch-policy-display-format';
import { PdfViewer } from '../../components/PdfViewer';
import { updatePolicy } from '../actions/update-policy';

interface PolicyContentManagerProps {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
  displayFormat?: PolicyDisplayFormat;
  pdfUrl?: string | null;
}

export function PolicyContentManager({
  policyId,
  policyContent,
  isPendingApproval,
  displayFormat = 'EDITOR',
  pdfUrl,
}: PolicyContentManagerProps) {
  const switchFormat = useAction(switchPolicyDisplayFormatAction, {
    onSuccess: () => toast.info('View mode switched.'),
    onError: () => toast.error('Failed to switch view.'),
  });

  const handleTabChange = (newFormat: string) => {
    switchFormat.execute({
      policyId,
      format: newFormat as 'EDITOR' | 'PDF',
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue={displayFormat} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EDITOR" disabled={isPendingApproval}>
              Editor View
            </TabsTrigger>
            <TabsTrigger value="PDF" disabled={isPendingApproval}>
              PDF View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="EDITOR" className="mt-4">
            <PolicyEditorWrapper
              policyId={policyId}
              policyContent={policyContent}
              isPendingApproval={isPendingApproval}
            />
          </TabsContent>
          <TabsContent value="PDF" className="mt-4">
            <PdfViewer policyId={policyId} pdfUrl={pdfUrl} isPendingApproval={isPendingApproval} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PolicyEditorWrapper({
  policyId,
  policyContent,
  isPendingApproval,
}: {
  policyId: string;
  policyContent: JSONContent | JSONContent[];
  isPendingApproval: boolean;
}) {
  const formattedContent = Array.isArray(policyContent)
    ? policyContent
    : [policyContent as JSONContent];
  const sanitizedContent = formattedContent.map((node) => {
    if (node.marks) node.marks = node.marks.filter((mark) => mark.type !== 'textStyle');
    if (node.content) node.content = node.content.map((child) => child);
    return node;
  });
  const validatedDoc = validateAndFixTipTapContent(sanitizedContent);
  const normalizedContent = (validatedDoc.content || []) as JSONContent[];

  const handleSavePolicy = async (content: JSONContent[]): Promise<void> => {
    if (!policyId) return;

    try {
      await updatePolicy({ policyId, content });
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
