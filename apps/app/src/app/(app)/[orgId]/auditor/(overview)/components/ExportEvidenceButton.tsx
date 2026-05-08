'use client';

import { downloadAllEvidenceZip } from '@/lib/evidence-download';
import {
  Button,
  HStack,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Stack,
  Switch,
  Text,
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
    <>
      <Button onClick={() => setIsOpen(true)}>Export All Evidence</Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Export All Evidence</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <Stack gap="lg">
              <Text size="sm" variant="muted">
                Download every task&apos;s uploaded evidence as a single ZIP so
                you can hand it to your auditor or keep an offline snapshot.
              </Text>

              <HStack justify="between" align="center">
                <Stack gap="none">
                  <Text size="sm" weight="medium">
                    Include raw JSON files
                  </Text>
                  <Text size="xs" variant="muted">
                    Adds machine-readable metadata alongside the evidence
                    files.
                  </Text>
                </Stack>
                <Switch checked={includeJson} onCheckedChange={setIncludeJson} />
              </HStack>

              <HStack justify="end">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isDownloading}
                >
                  Cancel
                </Button>
                <Button
                  iconLeft={<ArrowDown size={16} />}
                  onClick={handleDownload}
                  disabled={isDownloading}
                  loading={isDownloading}
                >
                  {isDownloading ? 'Preparing…' : 'Export'}
                </Button>
              </HStack>
            </Stack>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
