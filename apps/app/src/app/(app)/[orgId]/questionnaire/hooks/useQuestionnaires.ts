'use client';

import useSWR from 'swr';
import { api } from '@/lib/api-client';
import type { QuestionnaireListItem } from '../components/types';

const QUESTIONNAIRES_KEY = '/v1/questionnaire';

async function fetchQuestionnaires(): Promise<QuestionnaireListItem[]> {
  const response = await api.get<{ data: QuestionnaireListItem[] }>(QUESTIONNAIRES_KEY);
  if (response.error) throw new Error(response.error);
  return Array.isArray(response.data?.data) ? response.data.data : [];
}

interface UseQuestionnairesOptions {
  fallbackData?: QuestionnaireListItem[];
}

export function useQuestionnaires({ fallbackData }: UseQuestionnairesOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<QuestionnaireListItem[]>(
    QUESTIONNAIRES_KEY,
    fetchQuestionnaires,
    {
      fallbackData,
      revalidateOnMount: fallbackData === undefined,
    },
  );

  const deleteQuestionnaire = async (questionnaireId: string): Promise<boolean> => {
    const result = await api.delete<{ success: boolean }>(
      `/v1/questionnaire/${questionnaireId}`,
    );

    if (result.data?.success) {
      await mutate(
        (current) => {
          if (!Array.isArray(current)) return current;
          return current.filter((q) => q.id !== questionnaireId);
        },
        { revalidate: false },
      );
      return true;
    }

    throw new Error(result.error || 'Failed to delete questionnaire');
  };

  return {
    questionnaires: Array.isArray(data) ? data : [],
    error,
    isLoading,
    mutate,
    deleteQuestionnaire,
  };
}
