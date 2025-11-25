'use client';

import type { Policy } from '@db';
import type { JSONContent } from '@tiptap/react';
import { useUpdatePolicyContent } from '@/hooks/use-update-policy';
import { Button } from '@comp/ui/button';
import { Bot } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { PolicyAiAssistant } from '../../components/policy/ai/PolicyAiAssistant';
import { PolicyEditor } from '../../components/policy/PolicyEditor';
import { PortalPdfViewer } from '../../components/policy/PortalPdfViewer';

interface PolicyViewerProps {
  policy: Policy;
}

function convertContentToMarkdown(content: unknown): string {
  if (!content) return '';

  const contentArray = Array.isArray(content) ? content : [content];

  function extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return '';

    const n = node as Record<string, unknown>;

    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text;
    }

    if (Array.isArray(n.content)) {
      const texts = n.content.map(extractText).filter(Boolean);

      switch (n.type) {
        case 'heading': {
          const level = (n.attrs as Record<string, unknown>)?.level || 1;
          return '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n';
        }
        case 'paragraph':
          return texts.join('') + '\n';
        case 'bulletList':
        case 'orderedList':
          return '\n' + texts.join('');
        case 'listItem':
          return '- ' + texts.join('') + '\n';
        case 'blockquote':
          return '\n> ' + texts.join('\n> ') + '\n';
        default:
          return texts.join('');
      }
    }

    return '';
  }

  return contentArray.map(extractText).join('\n').trim();
}

export default function PolicyViewer({ policy }: PolicyViewerProps) {
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const updatePolicy = useUpdatePolicyContent();

  const currentPolicyMarkdown = useMemo(
    () => convertContentToMarkdown(policy.content),
    [policy.content]
  );

  if (policy.displayFormat === 'PDF') {
    return <PortalPdfViewer policyId={policy.id} s3Key={policy.pdfUrl} />;
  }

  const contentArray = (
    Array.isArray(policy.content) ? policy.content : [policy.content]
  ) as Array<JSONContent>;

  async function savePolicy(updatedContent: Array<JSONContent>) {
    try {
      await updatePolicy.mutateAsync({
        policyId: policy.id,
        organizationId: policy.organizationId,
        content: updatedContent,
      });
      toast.success('Policy saved successfully');
    } catch (error) {
      toast.error('Failed to save policy');
      throw error;
    }
  }

  async function applyAiChanges(content: Array<JSONContent>) {
    await savePolicy(content);
    toast.success('AI changes applied successfully');
  }

  function closeAssistant() {
    setShowAiAssistant(false);
  }

  function openAssistant() {
    setShowAiAssistant(true);
  }

  return (
    <div className="relative">
      <div className="flex gap-4">
        <div className={showAiAssistant ? 'flex-1' : 'w-full'}>
          <PolicyEditor content={contentArray} onSave={savePolicy} />
        </div>

        {showAiAssistant && (
          <div className="w-[400px] h-[600px] shrink-0">
            <PolicyAiAssistant
              policyId={policy.id}
              organizationId={policy.organizationId}
              currentPolicyMarkdown={currentPolicyMarkdown}
              applyChanges={applyAiChanges}
              close={closeAssistant}
            />
          </div>
        )}
      </div>

      {!showAiAssistant && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 gap-2 shadow-lg"
          onClick={openAssistant}
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      )}
    </div>
  );
}
