export interface Organization {
  id: string;
  name: string;
  logo?: string | null;
  memberRole?: string | null;
  memberId?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthState {
  status: 'authenticated' | 'unauthenticated';
  user: AuthUser | null;
  organizations: Organization[];
  selectedOrganizationId: string | null;
  apiBaseUrl: string;
  appBaseUrl: string;
}

export interface DetectedQuestion {
  id: string;
  question: string;
  value: string;
  isEmpty: boolean;
  tag: string;
}

export interface ScanDebugStep {
  name: string;
  status: 'ok' | 'fail' | 'skip';
  detail: string;
  count?: number;
  sample?: string;
}

export interface ScanDebug {
  surface: QuestionnaireSurface;
  source: string;
  questionCount: number;
  steps: ScanDebugStep[];
  updatedAt: number;
}

export interface SheetMapping {
  spreadsheetId: string;
  gid: string;
  questionColumn: string;
  answerColumn: string;
  startRow: number;
  endRow: number | null;
  source: 'auto' | 'manual';
  confirmed: boolean;
  updatedAt: number;
}

export interface GeneratedAnswer {
  questionIndex: number;
  question: string;
  answer: string | null;
  sources: unknown[];
  error?: string | null;
}

export type QuestionnaireSurface = 'generic' | 'docs' | 'sheets' | 'forms';

export type AnswerConfidence = 'high' | 'med' | 'low';

export type QueueStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'approved'
  | 'inserted'
  | 'flagged';

export interface QuestionQueueItem {
  id: string;
  fieldId: string;
  question: string;
  value: string;
  isEmpty: boolean;
  tag: string;
  status: QueueStatus;
  answer: string | null;
  confidence: AnswerConfidence | null;
  sources: unknown[];
  error?: string;
  edited: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TabQuestionQueue {
  tabId: number;
  url: string;
  host: string;
  surface: QuestionnaireSurface;
  sheetMapping: SheetMapping | null;
  organizationId: string | null;
  selectedItemId: string | null;
  staleDraftCount: number;
  items: QuestionQueueItem[];
  updatedAt: number;
}

export interface PanelState {
  auth: AuthState;
  queue: TabQuestionQueue;
  detectionEnabled: boolean;
}

export interface DomainConfirmationRequest {
  host: string;
  organizationId: string;
  organizationName: string;
}

export interface InsertAnswerRequest {
  fieldId: string;
  answer: string;
}

export interface BatchProgressItem {
  fieldId: string;
  question: string;
  status: 'pending' | 'generating' | 'ready' | 'error' | 'inserted' | 'skipped';
  answer: string | null;
  error?: string;
}
