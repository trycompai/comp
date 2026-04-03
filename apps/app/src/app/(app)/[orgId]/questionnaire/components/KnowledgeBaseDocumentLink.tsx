'use client';

import { LinkIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useKnowledgeBaseDocView } from '../hooks/useKnowledgeBaseDocView';

interface KnowledgeBaseDocumentLinkProps {
  documentId: string;
  sourceName: string;
  orgId: string;
  className?: string;
}

export function KnowledgeBaseDocumentLink({
  documentId,
  sourceName,
  orgId,
  className = 'font-medium text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
}: KnowledgeBaseDocumentLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { viewDocument } = useKnowledgeBaseDocView(orgId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await viewDocument(documentId);
      const { signedUrl, viewableInBrowser } = result;

      if (viewableInBrowser && signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        const knowledgeBaseUrl = `/${orgId}/questionnaire/knowledge-base`;
        window.open(knowledgeBaseUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening knowledge base document:', error);
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
