'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@trycompai/design-system';
import { ChevronDown } from '@trycompai/design-system/icons';
import { useRef, useState } from 'react';
import { AccessRevocationList } from './AccessRevocationList';
import {
  ChecklistStatusCircle,
  ItemBadges,
  ItemProgress,
} from './offboarding-item-indicators';
import { EvidenceContent, SimpleContent } from './offboarding-item-content';

interface OffboardingChecklistItemProps {
  item: ChecklistItem;
  memberId: string;
  canEdit: boolean;
  onComplete: (args: { templateItemId: string; file?: File }) => Promise<void>;
  onUncomplete: (templateItemId: string) => Promise<void>;
  onMarkException: (args: {
    templateItemId: string;
    reason: string;
  }) => Promise<void>;
  onUploadEvidence: (templateItemId: string, file: File) => Promise<void>;
  onDownload: (attachmentId: string) => Promise<void>;
  onChecklistRefresh?: () => void;
}

export function OffboardingChecklistItem({
  item,
  memberId,
  canEdit,
  onComplete,
  onUncomplete,
  onMarkException,
  onUploadEvidence,
  onDownload,
  onChecklistRefresh,
}: OffboardingChecklistItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dropzoneInputRef = useRef<HTMLInputElement>(null);

  const handleComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onComplete({ templateItemId: item.templateItemId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUncomplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onUncomplete(item.templateItemId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkException = async (reason: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onMarkException({ templateItemId: item.templateItemId, reason });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await handleFileUpload(file);
    } finally {
      if (dropzoneInputRef.current) dropzoneInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (!item.completed) {
        await onComplete({ templateItemId: item.templateItemId, file });
      } else {
        await onUploadEvidence(item.templateItemId, file);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isExpandable =
    item.isAccessRevocation || item.evidenceRequired || item.isException || canEdit;

  return (
    <Collapsible
      open={isExpandable ? isOpen : false}
      onOpenChange={isExpandable ? setIsOpen : undefined}
    >
      <div className="overflow-hidden rounded-lg border bg-background">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/50">
          <ChecklistStatusCircle item={item} memberId={memberId} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal">{item.title}</span>
              <ItemBadges item={item} />
            </div>
            {item.description && (
              <span className="truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
          {isExpandable && (
            <div className="flex shrink-0 items-center gap-3">
              <ItemProgress item={item} memberId={memberId} />
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          {item.isAccessRevocation ? (
            <AccessRevocationList
              memberId={memberId}
              canEdit={canEdit}
              onRevocationChange={onChecklistRefresh}
            />
          ) : (
            <div className="border-t px-3.5 py-3">
              {item.evidenceRequired ? (
                <EvidenceContent
                  item={item}
                  canEdit={canEdit}
                  isProcessing={isProcessing}
                  dropzoneInputRef={dropzoneInputRef}
                  onFileDrop={handleFileDrop}
                  onFileSelect={handleFileSelect}
                  onDownload={onDownload}
                  onUncomplete={handleUncomplete}
                  onMarkException={handleMarkException}
                />
              ) : (
                <SimpleContent
                  item={item}
                  canEdit={canEdit}
                  isProcessing={isProcessing}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onMarkException={handleMarkException}
                />
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
