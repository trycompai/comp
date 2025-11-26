'use client';

import { LinkIcon } from 'lucide-react';
import Link from 'next/link';

interface ManualAnswerLinkProps {
  manualAnswerId: string;
  sourceName: string;
  orgId: string;
  className?: string;
}

export function ManualAnswerLink({
  manualAnswerId,
  sourceName,
  orgId,
  className = 'font-medium text-primary hover:underline inline-flex items-center gap-1',
}: ManualAnswerLinkProps) {
  // Link to knowledge base page with hash anchor to scroll to specific manual answer
  const knowledgeBaseUrl = `/${orgId}/questionnaire/knowledge-base#manual-answer-${manualAnswerId}`;

  return (
    <Link
      href={knowledgeBaseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {sourceName}
      <LinkIcon className="h-3 w-3" />
    </Link>
  );
}

