'use client';

import { LinkIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api-client';

interface KnowledgeBaseDocumentLinkProps {
  documentId: string;
  sourceName: string;
  orgId: string;
  className?: string; // Allow custom className for different contexts (cards vs table)
}

export function KnowledgeBaseDocumentLink({
  documentId,
  sourceName,
  orgId,
  className = 'font-medium text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
}: KnowledgeBaseDocumentLinkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.post<{
        signedUrl: string;
        fileName: string;
        fileType: string;
        viewableInBrowser: boolean;
      }>(
        `/v1/knowledge-base/documents/${documentId}/view`,
        {
          organizationId: orgId,
        },
        orgId,
      );

      if (response.error) {
        // Fallback: navigate to knowledge base page
        const knowledgeBaseUrl = `/${orgId}/questionnaire/knowledge-base`;
        window.open(knowledgeBaseUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (response.data) {
        const { signedUrl, viewableInBrowser } = response.data;

        if (viewableInBrowser && signedUrl) {
          // File can be viewed in browser - open it directly
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          // File cannot be viewed in browser - navigate to knowledge base page
          const knowledgeBaseUrl = `/${orgId}/questionnaire/knowledge-base`;
          window.open(knowledgeBaseUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      console.error('Error opening knowledge base document:', error);
      // Fallback: navigate to knowledge base page
      const knowledgeBaseUrl = `/${orgId}/questionnaire/knowledge-base`;
      window.open(knowledgeBaseUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {sourceName}
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <LinkIcon className="h-3 w-3" />
      )}
    </button>
  );
}

