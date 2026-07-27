'use client';

import { Card } from '@trycompai/ui';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useSOAAutoFill } from '../hooks/useSOAAutoFill';
import { useSOADocument } from '../hooks/useSOADocument';
import type { Member, User } from '@db';
import { SOADocumentInfo } from './SOADocumentInfo';
import { SOAPendingApprovalAlert } from './SOAPendingApprovalAlert';
import { SubmitApprovalDialog } from './SubmitApprovalDialog';
import { SOATable } from './SOATable';
import type { SOAFieldSavePayload, SOATableAnswerData } from './EditableSOAFields';
import type { FrameworkWithLatestDocument } from '../types';

type Framework = FrameworkWithLatestDocument['framework'];
type Configuration = FrameworkWithLatestDocument['configuration'];
type Document = FrameworkWithLatestDocument['document'];

// More flexible configuration type that doesn't require framework property
type FlexibleConfiguration = Configuration & {
  framework?: Framework;
};

interface SOAFrameworkTableProps {
  framework: Framework;
  configuration: FlexibleConfiguration;
  document: Document | null;
  organizationId: string;
  isFullyRemote?: boolean;
  canApprove?: boolean;
  approver?: (Member & { user: User }) | null;
  isPendingApproval?: boolean;
  canCurrentUserApprove?: boolean;
  currentMemberId?: string | null;
  ownerAdminMembers?: (Member & { user: User })[];
}

type SOAColumn = {
  name: string;
  type: 'string' | 'boolean' | 'text';
};

type SOAQuestion = {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification?: string | null;
  };
};

type SOAAnswerRecord = {
  questionId: string;
  answer: string | null;
  isApplicable: boolean | null;
  answerVersion: number;
};

// Map a persisted answer to row state. `isApplicable` carries the persisted
// value; `savedIsApplicable` is deliberately left unset here — it is reserved
// for a manual save this session (set in handleAnswerUpdate) so it doesn't
// shadow in-session autofill results in resolveSoaDisplay.
function toAnswerData(answer: SOAAnswerRecord): SOATableAnswerData {
  return {
    answer: answer.answer,
    answerVersion: answer.answerVersion,
    isApplicable: answer.isApplicable,
  };
}

type SOADocumentInfoDocument = Parameters<typeof SOADocumentInfo>[0]['document'];

export function SOAFrameworkTable({
  framework,
  configuration,
  document,
  organizationId,
  isFullyRemote = false,
  canApprove = false,
  approver = null,
  isPendingApproval = false,
  canCurrentUserApprove = false,
  currentMemberId = null,
  ownerAdminMembers = [],
}: SOAFrameworkTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    document: swrDocument,
    approve,
    decline,
    submitForApproval,
    mutate: mutateSOADocument,
  } = useSOADocument({
    documentId: document?.id ?? null,
    organizationId,
    fallbackData: document,
  });

  // Derive state from SWR-cached document (updates after mutations)
  const resolvedDocument = swrDocument ?? document;
  const derivedIsPendingApproval = resolvedDocument
    ? resolvedDocument.status === 'needs_review'
    : isPendingApproval;
  const derivedApproverId = (resolvedDocument?.approverId ?? document?.approverId) as string | null | undefined;
  // Resolve the approver member from the list using the derived approverId
  const derivedApprover = derivedApproverId
    ? ownerAdminMembers.find((m) => m.id === derivedApproverId) ?? approver
    : null;
  const derivedCanCurrentUserApprove = derivedIsPendingApproval && derivedApproverId === currentMemberId;

  const columns = configuration.columns as SOAColumn[];
  const questions = configuration.questions as SOAQuestion[];

  // Create answers map from document answers. Applicability + justification are
  // per-organization values that live on the answer, so the table reads them
  // from here — never from the shared framework configuration.
  const [answersMap, setAnswersMap] = useState<Map<string, SOATableAnswerData>>(() => {
    return new Map(
      (document?.answers || []).map((answer: SOAAnswerRecord) => [
        answer.questionId,
        toAnswerData(answer),
      ])
    );
  });

  // Update answersMap when the live document changes
  useEffect(() => {
    if (!Array.isArray(resolvedDocument?.answers)) {
      return;
    }
    setAnswersMap(
      new Map(
        resolvedDocument.answers.map((answer: SOAAnswerRecord) => [
          answer.questionId,
          toAnswerData(answer),
        ])
      )
    );
  }, [resolvedDocument?.answers]);

  const handleAnswerUpdate = (questionId: string, payload: SOAFieldSavePayload) => {
    const existingAnswer = answersMap.get(questionId);
    const previousIsApplicable =
      existingAnswer?.savedIsApplicable ??
      processedResults.get(questionId)?.isApplicable ??
      existingAnswer?.isApplicable ??
      null;

    setAnswersMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      newMap.set(questionId, {
        answer: payload.justification,
        answerVersion: existing ? existing.answerVersion + 1 : 1,
        savedIsApplicable: payload.isApplicable,
      });
      return newMap;
    });

    void mutateSOADocument((current) => {
      if (!current) return current;

      const totalQuestions = current.totalQuestions as number | undefined;
      const currentAnsweredQuestions = current.answeredQuestions as number | undefined;

      if (
        typeof totalQuestions !== 'number' ||
        typeof currentAnsweredQuestions !== 'number'
      ) {
        return current;
      }

      const nextIsApplicable = payload.isApplicable ?? null;
      let answeredQuestions = currentAnsweredQuestions;

      if (previousIsApplicable === null && nextIsApplicable !== null) {
        answeredQuestions += 1;
      } else if (previousIsApplicable !== null && nextIsApplicable === null) {
        answeredQuestions -= 1;
      }

      answeredQuestions = Math.max(0, Math.min(totalQuestions, answeredQuestions));

      return {
        ...current,
        answeredQuestions,
        status: answeredQuestions === totalQuestions ? 'completed' : 'in_progress',
        approverId: null,
        approvedAt: null,
        declinedAt: null,
      };
    }, false);
  };

  const [isSubmitApprovalDialogOpen, setIsSubmitApprovalDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map questions to match hook's expected type
  const questionsForHook = useMemo(() => {
    return questions.map((q) => ({
      ...q,
      columnMapping: {
        ...q.columnMapping,
        justification: q.columnMapping.justification ?? null,
      },
    }));
  }, [questions]);

  const { isAutoFilling: isAutoFillingSSE, questionStatuses, processedResults, triggerAutoFill } = useSOAAutoFill({
    questions: questionsForHook,
    documentId: document?.id || '',
    organizationId,
    onUpdate: ({ total, answered } = {}) => {
      // Keep SOA info card in sync immediately after auto-fill completion.
      void mutateSOADocument((current) => {
        if (!current) return current;
        const totalQuestions =
          typeof total === 'number' ? total : (current.totalQuestions as number | undefined);
        const answeredQuestions =
          typeof answered === 'number'
            ? answered
            : (current.answeredQuestions as number | undefined);

        if (typeof totalQuestions !== 'number' || typeof answeredQuestions !== 'number') {
          return current;
        }

        return {
          ...current,
          totalQuestions,
          answeredQuestions,
          status:
            answeredQuestions === totalQuestions ? 'completed' : 'in_progress',
          approverId: null,
          approvedAt: null,
          declinedAt: null,
        };
      }, false);
    },
  });

  // Document should always exist at this point
  if (!document) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </Card>
    );
  }

  // Use the resolved SWR document so approval status updates instantly without page refresh.
  const docForInfo = resolvedDocument as unknown as SOADocumentInfoDocument;

  const handleAutoFill = async () => {
    if (!document) return;
    triggerAutoFill();
  };

  const handleApprove = async () => {
    if (!document) return;
    setIsApproving(true);
    try {
      await approve();
      toast.success('SOA document approved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve SOA document');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!document) return;
    setIsDeclining(true);
    try {
      await decline();
      toast.success('SOA document declined successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline SOA document');
    } finally {
      setIsDeclining(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!document || !selectedApproverId) return;
    setIsSubmitting(true);
    try {
      await submitForApproval(selectedApproverId);
      toast.success('SOA document submitted for approval successfully');
      setIsSubmitApprovalDialogOpen(false);
      setSelectedApproverId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit SOA document for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Pending Approval Alert */}
      {derivedIsPendingApproval && (
        <SOAPendingApprovalAlert
          approver={derivedApprover}
          currentMemberId={currentMemberId}
          approverId={derivedApproverId ?? null}
          canCurrentUserApprove={derivedCanCurrentUserApprove}
          isApproving={isApproving}
          isDeclining={isDeclining}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}

      {/* Document Info */}
      <SOADocumentInfo
        document={docForInfo}
        approver={derivedApprover}
        isPendingApproval={derivedIsPendingApproval}
        canApprove={canApprove}
        isAutoFillingSSE={isAutoFillingSSE}
        onAutoFill={handleAutoFill}
        onSubmitForApproval={() => setIsSubmitApprovalDialogOpen(true)}
      />

      {/* Table */}
      <SOATable
        columns={columns}
        questions={questions}
        answersMap={answersMap}
        questionStatuses={questionStatuses}
        processedResults={processedResults}
        isFullyRemote={isFullyRemote}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        documentId={resolvedDocument?.id ?? document.id}
        isPendingApproval={derivedIsPendingApproval}
        organizationId={organizationId}
        onAnswerUpdate={handleAnswerUpdate}
      />

      {/* Submit for Approval Dialog */}
      <SubmitApprovalDialog
        open={isSubmitApprovalDialogOpen}
        onOpenChange={setIsSubmitApprovalDialogOpen}
        ownerAdminMembers={ownerAdminMembers}
        selectedApproverId={selectedApproverId}
        onApproverChange={setSelectedApproverId}
        onSubmit={handleSubmitForApproval}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
