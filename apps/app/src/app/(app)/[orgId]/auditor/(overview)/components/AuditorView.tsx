const sections = [
  'Company Background & Overview of Operations',
  'Types of Services Provided',
  'Mission & Vision',
  'System Description',
  'Critical Vendors',
  'Subservice Organizations',
];

interface AuditorViewProps {
  initialContent: Record<string, string>;
}

export function AuditorView({ initialContent }: AuditorViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">Company Overview</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Documentation for audit purposes</p>
      </div>

      {/* Sections */}
      <div className="space-y-1">
        {sections.map((title, index) => (
          <AuditorSection
            key={title}
            title={title}
            content={initialContent[title] || ''}
            isLast={index === sections.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface AuditorSectionProps {
  title: string;
  content: string;
  isLast: boolean;
}

function AuditorSection({ title, content, isLast }: AuditorSectionProps) {
  const hasContent = content?.trim().length > 0;

  return (
    <div className={`group py-4 ${!isLast ? 'border-b border-border/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-1 shrink-0">
          {hasContent ? (
            <div className="h-2 w-2 rounded-full bg-primary" />
          ) : (
            <div className="h-2 w-2 rounded-full border border-muted-foreground/30" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {hasContent ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {content}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60">Not yet available</p>
          )}
        </div>
      </div>
    </div>
  );
}
