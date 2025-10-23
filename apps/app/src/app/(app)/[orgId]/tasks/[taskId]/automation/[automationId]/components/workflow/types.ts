export type TestResult = {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  logs?: string[];
  error?: string;
  summary?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
};
