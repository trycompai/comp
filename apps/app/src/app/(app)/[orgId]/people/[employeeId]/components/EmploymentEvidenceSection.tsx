'use client';

import { useEmploymentEvidence } from '@/hooks/use-employment-evidence';
import { Button, HStack, Section, Stack, Text } from '@trycompai/design-system';
import {
  DocumentDownload,
  TrashCan,
  Upload,
} from '@trycompai/design-system/icons';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface EmploymentEvidenceSectionProps {
  memberId: string;
  eventType: 'onboard' | 'offboard';
  title: string;
  description: string;
  canEdit: boolean;
}

export function EmploymentEvidenceSection({
  memberId,
  eventType,
  title,
  description,
  canEdit,
}: EmploymentEvidenceSectionProps) {
  const {
    attachments,
    isLoading,
    uploadEvidence,
    deleteEvidence,
    getDownloadUrl,
  } = useEmploymentEvidence({ memberId, eventType });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadEvidence(file);
      toast.success(`${title} uploaded`);
    } catch {
      toast.error('Failed to upload evidence');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string, name: string) => {
    try {
      await deleteEvidence(attachmentId);
      toast.success(`Deleted ${name}`);
    } catch {
      toast.error('Failed to delete evidence');
    }
  };

  const handleDownload = async (attachmentId: string) => {
    try {
      const url = await getDownloadUrl(attachmentId);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to get download URL');
    }
  };

  return (
    <Section title={title} description={description}>
      {isLoading ? (
        <Text variant="muted">Loading evidence...</Text>
      ) : (
        <Stack gap="2">
          {attachments.length === 0 && (
            <Text variant="muted">No evidence uploaded yet.</Text>
          )}
          {attachments.map((attachment) => (
            <HStack key={attachment.id} justify="between" align="center">
              <Text>{attachment.name}</Text>
              <HStack gap="1">
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(attachment.id)}
                  >
                    <DocumentDownload size={16} />
                  </Button>
                </div>
                {canEdit && (
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDelete(attachment.id, attachment.name)
                      }
                    >
                      <TrashCan size={16} />
                    </Button>
                  </div>
                )}
              </HStack>
            </HStack>
          ))}
        </Stack>
      )}

      {canEdit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
          />
          <div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              loading={isUploading}
              iconLeft={<Upload size={16} />}
            >
              Upload Evidence
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
