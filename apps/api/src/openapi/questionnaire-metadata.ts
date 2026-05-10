import type { PublicOperationMetadata } from './types';

export const QUESTIONNAIRE_OPERATION_METADATA: Record<
  string,
  PublicOperationMetadata
> = {
  QuestionnaireController_findAll_v1: {
    summary: 'List security questionnaires',
    description:
      'List saved security questionnaires for an organization so teams can track customer reviews, answer status, and response history.',
    href: '/api-reference/questionnaire/list-questionnaires',
  },
  QuestionnaireController_findById_v1: {
    summary: 'Get security questionnaire details',
    description:
      'Retrieve one saved security questionnaire, including extracted questions, generated answers, and review context for the requesting client.',
    href: '/api-reference/questionnaire/get-a-questionnaire-by-id',
  },
  QuestionnaireController_deleteById_v1: {
    summary: 'Delete a security questionnaire',
    description:
      'Delete a saved security questionnaire when a customer review or vendor assessment no longer needs to be retained.',
    href: '/api-reference/questionnaire/delete-a-questionnaire',
  },
  QuestionnaireController_parseQuestionnaire_v1: {
    summary: 'Parse questionnaire content',
    description:
      'Parse questionnaire content from a submitted payload so teams can extract security questions before generating or reviewing answers.',
    href: '/api-reference/questionnaire/parse-an-uploaded-questionnaire-file',
  },
  QuestionnaireController_answerSingleQuestion_v1: {
    summary: 'Answer one questionnaire question',
    description:
      'Generate an answer for one security questionnaire item using the organization evidence library and return source references for review.',
    href: '/api-reference/questionnaire/answer-a-single-questionnaire-question',
  },
  QuestionnaireController_saveAnswer_v1: {
    summary: 'Save questionnaire answer',
    description:
      'Save a manual or AI-generated security questionnaire answer for later review, export, and audit tracking.',
    href: '/api-reference/questionnaire/save-a-questionnaire-answer',
  },
  QuestionnaireController_deleteAnswer_v1: {
    summary: 'Delete questionnaire answer',
    description:
      'Delete a stored questionnaire answer when it should be removed from the active response set.',
    href: '/api-reference/questionnaire/delete-a-questionnaire-answer',
  },
  QuestionnaireController_exportById_v1: {
    summary: 'Export a security questionnaire',
    description:
      'Export a saved security questionnaire response package as PDF, CSV, or XLSX for customer and vendor security reviews.',
    href: '/api-reference/questionnaire/export-a-questionnaire',
  },
  QuestionnaireController_uploadAndParse_v1: {
    summary: 'Start questionnaire parsing',
    description:
      'Upload a questionnaire payload and start asynchronous parsing, returning a run ID for real-time progress tracking.',
    href: '/api-reference/questionnaire/upload-and-parse-a-questionnaire-file',
  },
  QuestionnaireController_uploadAndParseUpload_v1: {
    summary: 'Upload and parse questionnaire file',
    description:
      'Upload a security questionnaire file, extract questions, save the parsed questionnaire, and return its identifier and question count.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-parse-its-questions',
  },
  QuestionnaireController_parseQuestionnaireUpload_v1: {
    summary: 'Auto-answer uploaded questionnaire',
    description:
      'Upload a questionnaire file and generate answer exports from approved organization evidence in PDF, CSV, or XLSX format.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-auto-answer-with-export',
  },
  QuestionnaireController_parseQuestionnaireUploadByToken_v1: {
    summary: 'Upload questionnaire with Trust Access',
    description:
      'Internal Trust Access questionnaire upload used by the Comp AI frontend for reviewer access sessions.',
    visibility: 'excluded',
  },
  QuestionnaireController_autoAnswerAndExport_v1: {
    summary: 'Export generated questionnaire answers',
    description:
      'Generate and export questionnaire answers from a submitted payload using approved organization evidence.',
    href: '/api-reference/questionnaire/export-questionnaire-answers',
  },
  QuestionnaireController_autoAnswerAndExportUpload_v1: {
    summary: 'Upload and export generated answers',
    description:
      'Upload a questionnaire file and return generated answer exports in PDF, CSV, or XLSX format.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-export-auto-generated-answers',
  },
  QuestionnaireController_autoAnswer_v1: {
    summary: 'Stream generated questionnaire answers',
    description:
      'Stream generated questionnaire answers over server-sent events so clients can show progress while answers are produced.',
    href: '/api-reference/questionnaire/auto-answer-a-questionnaire',
  },
};
