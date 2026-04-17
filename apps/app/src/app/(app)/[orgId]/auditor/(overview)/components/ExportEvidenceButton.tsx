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
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportEvidenceButtonProps {
  organizationName: string;
}

export function ExportEvidenceButton({ organizationName }: ExportEvidenceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [includeJson, setIncludeJson] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadAllEvidenceZip({ organizationName, includeJson });
      toast.success('Evidence package downloaded successfully');
      setIsOpen(false);
    } catch (err) {
      toast.error('Failed to download evidence. Please try again.');
      console.error('Evidence download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer">
        Export All Evidence
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle>Export Options</PopoverTitle>
          <PopoverDescription>Download all task evidence as ZIP</PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm">Include raw JSON files</span>
          <Switch checked={includeJson} onCheckedChange={setIncludeJson} />
        </div>
        <Button
          iconLeft={<ArrowDown />}
          onClick={handleDownload}
          disabled={isDownloading}
          width="full"
        >
          {isDownloading ? 'Preparing…' : 'Export'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
