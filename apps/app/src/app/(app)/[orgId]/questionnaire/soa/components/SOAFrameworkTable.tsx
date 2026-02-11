'use client';

import { Card } from '@comp/ui';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useSOAAutoFill } from '../hooks/useSOAAutoFill';
import { useSOADocument } from '../../hooks/useSOADocument';
import { Member, User } from '@db';
import { SOADocumentInfo } from './SOADocumentInfo';
import { SOAPendingApprovalAlert } from './SOAPendingApprovalAlert';
import { SubmitApprovalDialog } from './SubmitApprovalDialog';
import { SOATable } from './SOATable';
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
    approve,
    decline,
    submitForApproval,
    mutate: mutateSOADocument,
  } = useSOADocument({
    documentId: document?.id ?? null,
    organizationId,
  });

  const columns = configuration.columns as SOAColumn[];
  const questions = configuration.questions as SOAQuestion[];

  // Create answers map from document answers
  const [answersMap, setAnswersMap] = useState<Map<string, { answer: string | null; answerVersion: number }>>(() => {
    return new Map(
      (document?.answers || []).map((answer: { questionId: string; answer: string | null; answerVersion: number }) => [
        answer.questionId,
        { answer: answer.answer, answerVersion: answer.answerVersion },
      ])
    );
  });

  // Update answersMap when document changes
  useEffect(() => {
    setAnswersMap(
      new Map(
        (document?.answers || []).map((answer: { questionId: string; answer: string | null; answerVersion: number }) => [
          answer.questionId,
          { answer: answer.answer, answerVersion: answer.answerVersion },
        ])
      )
    );
  }, [document?.answers]);

  const handleAnswerUpdate = (questionId: string, answer: string | null) => {
    setAnswersMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      newMap.set(questionId, {
        answer,
        answerVersion: existing ? existing.answerVersion + 1 : 1,
      });
      return newMap;
    });
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
    onUpdate: () => {
      // Revalidate SWR cache instead of full page reload
      void mutateSOADocument();
    },
  });

  // Merge processed results into questions for display
  const questionsWithResults = useMemo(() => {
    if (processedResults.size === 0) {
      return questions;
    }

    return questions.map((q) => {
      const result = processedResults.get(q.id);
      if (result && 'success' in result && result.success === true) {
        return {
          ...q,
          columnMapping: {
            ...q.columnMapping,
            isApplicable: result.isApplicable,
            justification: result.justification,
          },
        };
      }
      return q;
    });
  }, [questions, processedResults]);

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

  // The document comes from the Prisma SOADocument type which has all necessary fields.
  // We cast to the SOADocumentInfo's expected type for the info panel.
  const docForInfo = document as unknown as SOADocumentInfoDocument;
  const approverId = (document as Record<string, unknown>).approverId as string | null | undefined;

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
      {isPendingApproval && (
        <SOAPendingApprovalAlert
          approver={approver}
          currentMemberId={currentMemberId}
          approverId={approverId ?? null}
          canCurrentUserApprove={canCurrentUserApprove}
          isApproving={isApproving}
          isDeclining={isDeclining}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}

      {/* Document Info */}
      <SOADocumentInfo
        document={docForInfo}
        approver={approver}
        isPendingApproval={isPendingApproval}
        canApprove={canApprove}
        isAutoFillingSSE={isAutoFillingSSE}
        onAutoFill={handleAutoFill}
        onSubmitForApproval={() => setIsSubmitApprovalDialogOpen(true)}
      />

      {/* Table */}
      <SOATable
        columns={columns}
        questions={questionsWithResults}
        answersMap={answersMap}
        questionStatuses={questionStatuses}
        processedResults={processedResults}
        isFullyRemote={isFullyRemote}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        documentId={document.id}
        isPendingApproval={isPendingApproval}
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
