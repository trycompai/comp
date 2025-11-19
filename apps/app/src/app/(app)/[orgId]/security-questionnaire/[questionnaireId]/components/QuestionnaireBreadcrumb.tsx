'use client';

import { FileQuestion, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface QuestionnaireBreadcrumbProps {
  filename: string;
  organizationId: string;
}

export function QuestionnaireBreadcrumb({ filename, organizationId }: QuestionnaireBreadcrumbProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 -mx-4 -mt-4 border-b border-border/50 bg-muted/20 px-4 py-3">
      <ol className="flex items-center gap-2">
        {/* Security Questionnaire Link */}
        <li className="flex items-center">
          <Link
            href={`/${orgId}/security-questionnaire`}
            className="group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
          >
            <FileQuestion className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
            <span className="whitespace-nowrap">Security Questionnaire</span>
          </Link>
        </li>

        {/* Separator */}
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </li>

        {/* Current File */}
        <li className="flex items-center">
          <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="max-w-[400px] truncate font-semibold" title={filename}>
              {filename}
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}

