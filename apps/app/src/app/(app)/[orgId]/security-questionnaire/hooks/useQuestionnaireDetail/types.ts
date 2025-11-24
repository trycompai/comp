import type { QuestionAnswer } from '../../components/types';

export interface QuestionnaireQuestionAnswer {
  id: string;
  question: string;
  answer: string | null;
  status: 'untouched' | 'generated' | 'manual';
  questionIndex: number;
  sources: any;
}

export type QuestionnaireResult = QuestionAnswer & {
  originalIndex: number;
  questionAnswerId: string;
  status: 'untouched' | 'generated' | 'manual';
};

export interface UseQuestionnaireDetailProps {
  questionnaireId: string;
  organizationId: string;
  initialQuestions: QuestionnaireQuestionAnswer[];
}

