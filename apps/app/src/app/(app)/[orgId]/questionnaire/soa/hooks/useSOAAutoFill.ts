'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { env } from '@/env.mjs';
import { jwtManager } from '@/utils/jwt-manager';

interface UseSOAAutoFillProps {
  questions: Array<{
    id: string;
    text: string;
    columnMapping: {
      title: string;
      control_objective: string | null;
      isApplicable: boolean | null;
      justification: string | null;
    };
  }>;
  documentId: string;
  organizationId: string;
  onUpdate: () => void;
}

export function useSOAAutoFill({ questions, documentId, organizationId, onUpdate }: UseSOAAutoFillProps) {
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Map<string, 'pending' | 'processing' | 'completed' | 'failed' | 'insufficient_data'>>(new Map());
  const [processedResults, setProcessedResults] = useState<Map<string, { isApplicable: boolean | null; justification: string | null; success: boolean; insufficientData?: boolean }>>(new Map());
  const isAutoFillProcessStartedRef = useRef(false);

  const triggerAutoFill = async () => {
    setIsAutoFilling(true);
    isAutoFillProcessStartedRef.current = true;
    // Set all questions to 'processing' immediately for instant spinner feedback
    setQuestionStatuses(new Map(questions.map((q) => [q.id, 'processing'])));
    setProcessedResults(new Map());

    try {
      // Use fetch with ReadableStream for SSE (EventSource only supports GET)
      // credentials: 'include' is required to send cookies for authentication
      const token = await jwtManager.getValidToken();
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/soa/auto-fill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Organization-Id': organizationId,
          },
          credentials: 'include',
          body: JSON.stringify({
            documentId,
            organizationId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                // Progress update
                // Could show overall progress if needed
              } else if (data.type === 'processing') {
                // Question is being processed
                setQuestionStatuses((prev) => {
                  const newStatuses = new Map(prev);
                  newStatuses.set(data.questionId, 'processing');
                  return newStatuses;
                });
              } else if (data.type === 'answer') {
                // Answer received for a question
                const isSuccess = data.success && data.isApplicable !== null;
                const isInsufficientData = data.insufficientData === true;
                
                setQuestionStatuses((prev) => {
                  const newStatuses = new Map(prev);
                  if (isInsufficientData) {
                    newStatuses.set(data.questionId, 'insufficient_data');
                  } else {
                    newStatuses.set(data.questionId, isSuccess ? 'completed' : 'failed');
                  }
                  return newStatuses;
                });

                // Store result regardless of success to track failed attempts
                setProcessedResults((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(data.questionId, {
                    isApplicable: data.isApplicable,
                    justification: data.justification,
                    success: data.success || false,
                    insufficientData: data.insufficientData || false,
                  });
                  return newMap;
                });
              } else if (data.type === 'complete') {
                // All questions completed
                toast.success(`Auto-filled ${data.answered} questions`);
                setIsAutoFilling(false);
                onUpdate();
              } else if (data.type === 'error') {
                toast.error(data.error || 'Failed to auto-fill SOA');
                setIsAutoFilling(false);
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in auto-fill SOA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to auto-fill SOA');
      setIsAutoFilling(false);
    }
  };

  return {
    isAutoFilling,
    questionStatuses,
    processedResults,
    triggerAutoFill,
  };
}

