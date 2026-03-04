'use client';

import { Card } from '@comp/ui';
import { Button } from '@trycompai/design-system';
import type { Member, User } from '@db';

type Document = {
  id: string;
  version: number;
  totalQuestions: number;
  answeredQuestions: number;
  status: string;
  preparedBy: string | null;
  approverId?: string | null;
  approvedAt?: Date | null;
  declinedAt?: Date | null;
  declinedBy?: (Member & { user: User }) | null;
};

interface SOADocumentInfoProps {
  document: Document;
  approver?: (Member & { user: User }) | null;
  isPendingApproval: boolean;
  canApprove: boolean;
  isAutoFillingSSE: boolean;
  onAutoFill: () => void;
  onSubmitForApproval: () => void;
}

export function SOADocumentInfo({
  document,
  approver,
  isPendingApproval,
  canApprove,
  isAutoFillingSSE,
  onAutoFill,
  onSubmitForApproval,
}: SOADocumentInfoProps) {
  const progressPercentage = document.totalQuestions > 0
    ? Math.round((document.answeredQuestions / document.totalQuestions) * 100)
    : 0;

  const approvalStatusText = document.approvedAt
    ? `Approved on ${new Date(document.approvedAt).toLocaleDateString()}`
    : document.status === 'needs_review' && document.declinedAt
      ? `Declined on ${new Date(document.declinedAt).toLocaleDateString()}`
      : approver
        ? 'Pending approval'
        : 'Not approved';

  return (
    <div className="space-y-3">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {!isPendingApproval && canApprove && document.status !== 'needs_review' && (
          <Button
            onClick={onSubmitForApproval}
            size="sm"
            variant="outline"
            disabled={!!document.approvedAt}
          >
            Submit for Approval
          </Button>
        )}
        <Button
          onClick={onAutoFill}
          disabled={isAutoFillingSSE}
          loading={isAutoFillingSSE}
          size="sm"
        >
          {isAutoFillingSSE ? 'Auto-Filling...' : 'Auto-Fill All'}
        </Button>
      </div>

      {/* Metrics */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:flex xl:items-center xl:gap-6">
          <InfoItem label="Version" value={`v${document.version}`} />
          <div className="hidden xl:block h-8 w-px bg-border" />
          <InfoItem
            label="Progress"
            value={`${document.answeredQuestions} / ${document.totalQuestions}`}
            suffix={`(${progressPercentage}%)`}
          />
          <div className="hidden xl:block h-8 w-px bg-border" />
          <InfoItem label="Prepared by" value={document.preparedBy || 'Comp AI'} />
          <div className="hidden xl:block h-8 w-px bg-border" />
          <InfoItem label="Approval status" value={approvalStatusText} />

          {approver && document.approvedAt && (
            <>
              <div className="hidden xl:block h-8 w-px bg-border" />
              <InfoItem label="Approved by" value={approver.user.name || approver.user.email || 'Unknown'} />
            </>
          )}
          {approver && !document.approvedAt && document.status !== 'needs_review' && (
            <>
              <div className="hidden xl:block h-8 w-px bg-border" />
              <InfoItem label="Pending approval by" value={approver.user.name || approver.user.email || 'Unknown'} />
            </>
          )}
          {document.status === 'needs_review' && document.declinedAt && (
            <>
              <div className="hidden xl:block h-8 w-px bg-border" />
              <InfoItem
                label="Declined by"
                value={
                  document.declinedBy?.user?.name ||
                  document.declinedBy?.user?.email ||
                  approver?.user.name ||
                  approver?.user.email ||
                  'Unknown'
                }
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function InfoItem({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
