'use client';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';
import { useAccessRevocations } from '@/hooks/use-access-revocations';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import {
  Checkmark,
  ChevronDown,
  DocumentDownload,
  Upload,
} from '@trycompai/design-system/icons';
import { useRef, useState } from 'react';
import { AccessRevocationList } from './AccessRevocationList';

interface OffboardingChecklistItemProps {
  item: ChecklistItem;
  memberId: string;
  canEdit: boolean;
  onComplete: (args: { templateItemId: string; file?: File }) => Promise<void>;
  onUncomplete: (templateItemId: string) => Promise<void>;
  onUploadEvidence: (templateItemId: string, file: File) => Promise<void>;
  onDownload: (attachmentId: string) => Promise<void>;
  onChecklistRefresh?: () => void;
}

function StatusCircle({ done, total }: { done: number; total: number }) {
  const allDone = done === total && total > 0;
  const partial = done > 0 && !allDone;

  if (allDone) {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Checkmark size={11} />
      </div>
    );
  }
  if (partial) {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary">
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>
    );
  }
  return (
    <div
      className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px]"
      style={{ borderColor: 'oklch(0.85 0 0)' }}
    />
  );
}

function ChecklistStatusCircle({
  item,
  memberId,
}: {
  item: ChecklistItem;
  memberId: string;
}) {
  if (item.isAccessRevocation) {
    return <AccessRevocationStatusCircle memberId={memberId} />;
  }
  const done = item.completed ? 1 : 0;
  return <StatusCircle done={done} total={1} />;
}

function AccessRevocationStatusCircle({ memberId }: { memberId: string }) {
  const { revocations } = useAccessRevocations(memberId);
  if (!revocations) return <StatusCircle done={0} total={0} />;
  return (
    <StatusCircle
      done={revocations.revokedCount}
      total={revocations.totalVendors}
    />
  );
}

function ItemBadges({
  item,
}: {
  item: ChecklistItem;
}) {
  return (
    <>
      {item.isAccessRevocation && (
        <div>
          <Badge variant="destructive">Critical</Badge>
        </div>
      )}
      {item.evidenceRequired && (
        <div>
          <Badge variant="outline">Evidence</Badge>
        </div>
      )}
    </>
  );
}

function ItemProgress({
  item,
  memberId,
}: {
  item: ChecklistItem;
  memberId: string;
}) {
  if (item.isAccessRevocation) {
    return <AccessRevocationProgress memberId={memberId} />;
  }
  const done = item.completed ? 1 : 0;
  const total = 1;
  const pct = done / total;
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[56px] text-right font-mono text-xs tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
      <div className="h-1 w-[60px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function AccessRevocationProgress({ memberId }: { memberId: string }) {
  const { revocations } = useAccessRevocations(memberId);
  if (!revocations) return null;
  const pct =
    revocations.totalVendors > 0
      ? revocations.revokedCount / revocations.totalVendors
      : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[56px] text-right font-mono text-xs tabular-nums text-muted-foreground">
        {revocations.revokedCount}/{revocations.totalVendors}
      </span>
      <div className="h-1 w-[60px] overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

export function OffboardingChecklistItem({
  item,
  memberId,
  canEdit,
  onComplete,
  onUncomplete,
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

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
    item.isAccessRevocation || item.evidenceRequired || canEdit;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
                />
              ) : (
                <SimpleContent
                  item={item}
                  canEdit={canEdit}
                  isProcessing={isProcessing}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                />
              )}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SimpleContent({
  item,
  canEdit,
  isProcessing,
  onComplete,
  onUncomplete,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  isProcessing: boolean;
  onComplete: () => void;
  onUncomplete: () => void;
}) {
  if (!canEdit) return null;

  return (
    <div>
      {item.completed ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onUncomplete}
          disabled={isProcessing}
          loading={isProcessing}
        >
          Undo
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onComplete}
          disabled={isProcessing}
          loading={isProcessing}
        >
          Mark complete
        </Button>
      )}
    </div>
  );
}

function EvidenceContent({
  item,
  canEdit,
  isProcessing,
  dropzoneInputRef,
  onFileDrop,
  onFileSelect,
  onDownload,
  onUncomplete,
}: {
  item: ChecklistItem;
  canEdit: boolean;
  isProcessing: boolean;
  dropzoneInputRef: React.RefObject<HTMLInputElement | null>;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (attachmentId: string) => void;
  onUncomplete: () => void;
}) {
  return (
    <Stack gap="3">
      {item.evidence.length > 0 && (
        <Stack gap="1">
          {item.evidence.map((file) => (
            <HStack key={file.id} gap="2" align="center">
              <Text size="sm" variant="muted">
                {file.name}
              </Text>
              <div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDownload(file.id)}
                >
                  <DocumentDownload size={14} />
                </Button>
              </div>
            </HStack>
          ))}
        </Stack>
      )}

      {canEdit && (
        <div
          onDrop={onFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => dropzoneInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 px-4 py-6 text-center transition hover:border-muted-foreground/50 hover:bg-muted/25"
        >
          <Upload size={20} className="text-muted-foreground" />
          <div>
            <Text size="sm" variant="muted">
              {item.completed
                ? 'Drop files here or click to add more evidence'
                : 'Drop files here or click to upload proof and mark as complete'}
            </Text>
          </div>
          <input
            ref={dropzoneInputRef}
            type="file"
            className="hidden"
            onChange={onFileSelect}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xlsx"
          />
        </div>
      )}

      {item.completed && canEdit && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUncomplete}
            disabled={isProcessing}
            loading={isProcessing}
          >
            Undo completion
          </Button>
        </div>
      )}
    </Stack>
  );
}
