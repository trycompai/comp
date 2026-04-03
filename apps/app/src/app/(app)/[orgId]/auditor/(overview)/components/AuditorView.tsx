'use client';

import { downloadAllEvidenceZip } from '@/lib/evidence-download';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Switch,
} from '@trycompai/design-system';
import { ArrowDown } from '@trycompai/design-system/icons';
import { Download } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface AuditorViewProps {
  initialContent: Record<string, string>;
  organizationName: string;
  logoUrl: string | null;
  employeeCount: string | null;
  cSuite: { name: string; title: string }[];
  reportSignatory: { fullName: string; jobTitle: string; email: string } | null;
}

export function AuditorView({
  initialContent,
  organizationName,
  logoUrl,
  employeeCount,
  cSuite,
  reportSignatory,
}: AuditorViewProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeJson, setIncludeJson] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleDownloadAllEvidence = async () => {
    setIsDownloading(true);
    try {
      await downloadAllEvidenceZip({
        organizationName,
        includeJson,
      });
      toast.success('Evidence package downloaded successfully');
      setIsPopoverOpen(false);
    } catch (err) {
      toast.error('Failed to download evidence. Please try again.');
      console.error('Evidence download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <a
              href={logoUrl}
              download={`${organizationName.replace(/[^a-zA-Z0-9]/g, '_')}_logo`}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-background transition-all hover:shadow-md"
              title="Download logo"
            >
              <Image src={logoUrl} alt={`${organizationName} logo`} fill className="object-contain" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Download className="h-4 w-4 text-white" />
              </div>
            </a>
          )}
          <div>
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              {organizationName}
            </h1>
            <p className="text-muted-foreground text-sm">Company Overview</p>
          </div>
        </div>

        {/* Download All Evidence Button */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger style={{ cursor: 'pointer' }}>
            <Button variant="outline">Export All Evidence</Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8}>
            <PopoverHeader>
              <PopoverTitle>Export Options</PopoverTitle>
              <PopoverDescription>Download all task evidence as ZIP</PopoverDescription>
            </PopoverHeader>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm">Include raw JSON files</span>
              <Switch checked={includeJson} onCheckedChange={(checked) => setIncludeJson(checked)} />
            </div>
            <Button
              iconLeft={<ArrowDown />}
              onClick={handleDownloadAllEvidence}
              disabled={isDownloading}
              width="full"
            >
              {isDownloading ? 'Preparing…' : 'Export'}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Company Information */}
      <Section title="Company Information">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell
            label="Employees"
            value={employeeCount || '—'}
            className="lg:border-r lg:border-border lg:pr-6"
          />
          <InfoCell
            label="Report Signatory"
            className="lg:border-r lg:border-border lg:pr-6"
            value={
              reportSignatory ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{reportSignatory.fullName}</span>
                    <span className="text-muted-foreground text-xs">
                      {reportSignatory.jobTitle}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {reportSignatory.email}
                  </div>
                </div>
              ) : (
                '—'
              )
            }
          />
          <InfoCell
            label="Executive Team"
            className="sm:col-span-2 lg:col-span-1"
            value={
              cSuite.length > 0 ? (
                <div className="space-y-1">
                  {cSuite.map((exec, i) => (
                    <div key={i} className="flex items-baseline gap-2 text-sm">
                      <span className="font-medium">{exec.name}</span>
                      <span className="text-muted-foreground text-xs">{exec.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                '—'
              )
            }
          />
        </div>
      </Section>

      {/* Business Overview */}
      <Section title="Business Overview">
        <div className="space-y-6">
          <ContentRow
            title="Company Background & Overview of Operations"
            content={initialContent['Company Background & Overview of Operations']}
          />
          <ContentRow
            title="Types of Services Provided"
            content={initialContent['Types of Services Provided']}
          />
          <ContentRow title="Mission & Vision" content={initialContent['Mission & Vision']} />
        </div>
      </Section>

      {/* System Architecture */}
      <Section title="System Architecture">
        <ContentRow title="System Description" content={initialContent['System Description']} />
      </Section>

      {/* Third Party Dependencies */}
      <Section title="Third Party Dependencies">
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentRow title="Critical Vendors" content={initialContent['Critical Vendors']} />
          <ContentRow
            title="Subservice Organizations"
            content={initialContent['Subservice Organizations']}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border pb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function InfoCell({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className || ''}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function ContentRow({ title, content }: { title: string; content?: string }) {
  const hasContent = content?.trim().length;

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {hasContent ? (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {content}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50">Not yet available</p>
      )}
    </div>
  );
}
