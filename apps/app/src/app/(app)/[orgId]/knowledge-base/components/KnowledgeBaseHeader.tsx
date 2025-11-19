'use client';

import { FileQuestion, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

interface KnowledgeBaseHeaderProps {
  organizationId: string;
}

export function KnowledgeBaseHeader({ organizationId }: KnowledgeBaseHeaderProps) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  // Check if we're on the knowledge base page
  const isOnKnowledgeBase = pathname === `/${orgId}/knowledge-base`;
  const isOnStartPage = pathname === `/${orgId}/security-questionnaire`;

  return (
    <div className="mb-8 flex flex-col gap-6">
      {/* Header with navigation buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Knowledge Base</h1>
          <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Manage your organization's knowledge base including published policies, context entries,
            manual answers, and additional documents.
          </p>
        </div>
        <div className="flex w-full items-center gap-0 rounded-md border border-border bg-card p-0.5 md:inline-flex md:w-auto">
          <Link
            href={`/${orgId}/security-questionnaire`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors md:flex-initial md:justify-start ${
              isOnStartPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <FileQuestion className="h-3.5 w-3.5" />
            <span>Questionnaires</span>
          </Link>
          <Link
            href={`/${orgId}/knowledge-base`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors md:flex-initial md:justify-start ${
              isOnKnowledgeBase
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Knowledge Base</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

