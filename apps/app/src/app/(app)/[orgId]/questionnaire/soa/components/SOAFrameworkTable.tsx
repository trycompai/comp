'use client';

import { Card } from '@comp/ui';
import { Button } from '@comp/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSOAAutoFill } from '../hooks/useSOAAutoFill';
import { api } from '@/lib/api-client';
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
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Log isFullyRemote prop on mount
  console.log('[SOA Table] Component initialized:', {
    organizationId,
    isFullyRemote,
    questionsCount: (configuration.questions as Array<any>)?.length || 0,
  });

  const columns = configuration.columns as SOAColumn[];
  const questions = configuration.questions as SOAQuestion[];
  
  // Log all controls with closure starting with "7." for debugging
  useMemo(() => {
    const controls7 = questions.filter((q) => {
      const closure = q.columnMapping.closure || '';
      return closure.startsWith('7.');
    });
    
    console.log('[SOA Table] Controls with closure starting with "7.":', {
      isFullyRemote,
      controls7Count: controls7.length,
      controls7Details: controls7.map((q) => ({
        id: q.id,
        closure: q.columnMapping.closure,
        title: q.columnMapping.title,
        currentIsApplicable: q.columnMapping.isApplicable,
      })),
    });
    
    return controls7;
  }, [questions, isFullyRemote]);
  
  // Create answers map from document answers (for justification and to check if answer exists)
  // Memoize to prevent hydration mismatches
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
  
  // Create a map to check if question has a latest answer
  const hasAnswerMap = useMemo(() => {
    return new Map(
      (document?.answers || []).map((answer: { questionId: string; answerVersion: number }) => [
        answer.questionId,
        answer.answerVersion,
      ])
    );
  }, [document?.answers]);


  const [isSubmitApprovalDialogOpen, setIsSubmitApprovalDialogOpen] = useState(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use SSE hook for real-time updates
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
      // Refresh server-side data without full page reload
      // The UI state is already updated via SSE, so we just need to sync server state
      router.refresh();
    },
  });

  // Merge processed results into questions for display (only during auto-fill)
  // Use useMemo to prevent hydration mismatches
  const questionsWithResults = useMemo(() => {
    // Only merge if we have processed results (during auto-fill)
    if (processedResults.size === 0) {
      return questions;
    }
    
    return questions.map((q) => {
      const result = processedResults.get(q.id);
      if (result && 'success' in result && result.success === true) {
        // Only merge if generation was successful
        return {
          ...q,
          columnMapping: {
            ...q.columnMapping,
            isApplicable: result.isApplicable,
            justification: result.justification,
          },
        };
      }
      // If failed or not successful, keep original (don't show YES/NO)
      return q;
    });
  }, [questions, processedResults]);


  // Document should always exist at this point (created server-side)
  // If it doesn't exist, show loading state
  if (!document) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </Card>
    );
  }

  const handleAutoFill = async () => {
    if (!document) return;
    triggerAutoFill();
  };

  const handleApprove = async () => {
    if (!document) return;
    setIsApproving(true);
    try {
      const response = await api.post<{ success: boolean; data?: unknown }>(
        '/v1/soa/approve',
        {
          organizationId,
          documentId: document.id,
        },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to approve SOA document');
      } else if (response.data?.success) {
        toast.success('SOA document approved successfully');
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to approve SOA document');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!document) return;
    setIsDeclining(true);
    try {
      const response = await api.post<{ success: boolean; data?: unknown }>(
        '/v1/soa/decline',
        {
          organizationId,
          documentId: document.id,
        },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to decline SOA document');
      } else if (response.data?.success) {
        toast.success('SOA document declined successfully');
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to decline SOA document');
    } finally {
      setIsDeclining(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!document || !selectedApproverId) return;
    setIsSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; data?: unknown }>(
        '/v1/soa/submit-for-approval',
        {
          organizationId,
          documentId: document.id,
          approverId: selectedApproverId,
        },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to submit SOA document for approval');
      } else if (response.data?.success) {
        toast.success('SOA document submitted for approval successfully');
        setIsSubmitApprovalDialogOpen(false);
        setSelectedApproverId(null);
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to submit SOA document for approval');
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
          approverId={(document as any).approverId}
          canCurrentUserApprove={canCurrentUserApprove}
          isApproving={isApproving}
          isDeclining={isDeclining}
          onApprove={handleApprove}
          onDecline={handleDecline}
        />
      )}

      {/* Document Info */}
      <SOADocumentInfo
        document={document as any}
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

