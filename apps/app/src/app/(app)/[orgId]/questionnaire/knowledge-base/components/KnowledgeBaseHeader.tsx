'use client';

interface KnowledgeBaseHeaderProps {
  organizationId: string;
}

export function KnowledgeBaseHeader({ organizationId }: KnowledgeBaseHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Knowledge Base</h1>
      <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
        Manage your organization's knowledge base including published policies, context entries,
        manual answers, and additional documents.
      </p>
    </div>
  );
}

