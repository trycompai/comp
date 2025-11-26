'use client';

import { Card } from '@comp/ui';
import { Button } from '@comp/ui/button';
import { Zap, Loader2, ShieldCheck } from 'lucide-react';
import { Member, User } from '@db';

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

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Version</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">v{document.version}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progress</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {document.answeredQuestions} / {document.totalQuestions}
              </span>
              <span className="text-xs text-muted-foreground">({progressPercentage}%)</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prepared by</p>
            <p className="text-sm font-semibold text-foreground">{document.preparedBy || 'Comp AI'}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval status</p>
            <p className="text-sm font-semibold text-foreground">
              {document.approvedAt
                ? `Approved on ${new Date(document.approvedAt).toLocaleDateString()}`
                : document.status === 'needs_review' && document.declinedAt
                  ? `Declined on ${new Date(document.declinedAt).toLocaleDateString()}`
                  : approver
                    ? 'Pending approval'
                    : 'Not approved'}
            </p>
          </div>
          {approver && document.approvedAt && (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved by</p>
                <p className="text-sm font-semibold text-foreground">
                  {approver.user.name || approver.user.email || 'Unknown'}
                </p>
              </div>
            </>
          )}
          {approver && !document.approvedAt && document.status !== 'needs_review' && (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending approval by</p>
                <p className="text-sm font-semibold text-foreground">
                  {approver.user.name || approver.user.email || 'Unknown'}
                </p>
              </div>
            </>
          )}
          {document.status === 'needs_review' && document.declinedAt && (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Declined by</p>
                <p className="text-sm font-semibold text-foreground">
                  {document.declinedBy?.user?.name ||
                    document.declinedBy?.user?.email ||
                    approver?.user.name ||
                    approver?.user.email ||
                    'Unknown'}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isPendingApproval && canApprove && document.status !== 'needs_review' && (
            <Button
              onClick={onSubmitForApproval}
              size="sm"
              variant="outline"
              disabled={!!document.approvedAt}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          )}
          <Button
            onClick={onAutoFill}
            disabled={isAutoFillingSSE}
            size="sm"
          >
            {isAutoFillingSSE ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Auto-Filling...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Auto-Fill All
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

