import type { OpenAPIObject } from '@nestjs/swagger';

export const PUBLIC_OPENAPI_TITLE = 'Comp AI API';

export const PUBLIC_OPENAPI_DESCRIPTION =
  'Comp AI API reference for automating compliance workflows, including evidence collection, policies, trust access, tasks, and security questionnaires.';

type PublicOperationMetadata = {
  summary: string;
  description: string;
  href: string;
  sidebarTitle?: string;
  visibility?: 'public' | 'hidden' | 'excluded';
  content?: string;
  codeSamples?: Array<{
    lang: string;
    label?: string;
    source: string;
  }>;
};

type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  [key: string]: unknown;
};

const QUESTIONNAIRE_OPERATION_METADATA: Record<
  string,
  PublicOperationMetadata
> = {
  QuestionnaireController_findAll_v1: {
    summary: 'List questionnaires',
    description:
      'List all security questionnaires for an organization with auth context for API clients and compliance automation workflows.',
    href: '/api-reference/questionnaire/list-questionnaires',
  },
  QuestionnaireController_findById_v1: {
    summary: 'Get questionnaire details',
    description:
      'Retrieve one saved security questionnaire, including parsed questions, answers, and authentication context for the requesting client.',
    href: '/api-reference/questionnaire/get-a-questionnaire-by-id',
  },
  QuestionnaireController_deleteById_v1: {
    summary: 'Delete a questionnaire',
    description:
      'Delete a saved security questionnaire for an organization when it is no longer needed for compliance review workflows.',
    href: '/api-reference/questionnaire/delete-a-questionnaire',
  },
  QuestionnaireController_parseQuestionnaire_v1: {
    summary: 'Parse questionnaire content',
    description:
      'Parse questionnaire content from a submitted payload so teams can extract security questions before generating or reviewing answers.',
    href: '/api-reference/questionnaire/parse-an-uploaded-questionnaire-file',
  },
  QuestionnaireController_answerSingleQuestion_v1: {
    summary: 'Answer one question',
    description:
      'Generate an answer for one security questionnaire item using the organization evidence library and return source references.',
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
    summary: 'Export a questionnaire',
    description:
      'Export a saved security questionnaire response package as PDF, CSV, or XLSX for customer and vendor reviews.',
    href: '/api-reference/questionnaire/export-a-questionnaire',
  },
  QuestionnaireController_uploadAndParse_v1: {
    summary: 'Start questionnaire parsing',
    description:
      'Upload a questionnaire payload and start asynchronous parsing, returning a run ID for real-time progress tracking.',
    href: '/api-reference/questionnaire/upload-and-parse-a-questionnaire-file',
  },
  QuestionnaireController_uploadAndParseUpload_v1: {
    summary: 'Upload and parse file',
    description:
      'Upload a questionnaire file, extract questions, save the parsed questionnaire, and return its identifier and question count.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-parse-its-questions',
  },
  QuestionnaireController_parseQuestionnaireUpload_v1: {
    summary: 'Auto-answer uploaded file',
    description:
      'Upload a questionnaire file and generate answer exports from approved organization evidence in PDF, CSV, or XLSX format.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-auto-answer-with-export',
  },
  QuestionnaireController_parseQuestionnaireUploadByToken_v1: {
    summary: 'Auto-answer with Trust Access',
    description:
      'Upload a questionnaire with a Trust Access token and return a ZIP containing answered PDF, CSV, and XLSX exports for reviewers.',
    href: '/api-reference/questionnaire/upload-and-auto-answer-a-questionnaire-via-trust-portal-token',
    sidebarTitle: 'Trust Access auto-answer',
    content:
      'Use this endpoint when an external reviewer has an active Trust Access token and needs to upload a security questionnaire for automated answering. Comp AI validates the token, generates answers from approved Trust Center evidence, and returns a ZIP with completed PDF, CSV, and XLSX exports.',
    codeSamples: [
      {
        lang: 'bash',
        label: 'Upload a questionnaire with a Trust Access token',
        source:
          'curl --request POST --url "https://api.trycomp.ai/v1/questionnaire/parse/upload/token?token=$TRUST_ACCESS_TOKEN" --form "file=@security-questionnaire.xlsx"',
      },
    ],
  },
  QuestionnaireController_autoAnswerAndExport_v1: {
    summary: 'Export generated answers',
    description:
      'Generate and export questionnaire answers from a submitted payload using approved organization evidence.',
    href: '/api-reference/questionnaire/export-questionnaire-answers',
  },
  QuestionnaireController_autoAnswerAndExportUpload_v1: {
    summary: 'Upload and export answers',
    description:
      'Upload a questionnaire file and return generated answer exports in PDF, CSV, or XLSX format.',
    href: '/api-reference/questionnaire/upload-a-questionnaire-file-and-export-auto-generated-answers',
  },
  QuestionnaireController_autoAnswer_v1: {
    summary: 'Stream generated answers',
    description:
      'Stream generated questionnaire answers over server-sent events so clients can show progress while answers are produced.',
    href: '/api-reference/questionnaire/auto-answer-a-questionnaire',
  },
};

export const PUBLIC_OPERATION_METADATA: Record<
  string,
  PublicOperationMetadata
> = {
  ...QUESTIONNAIRE_OPERATION_METADATA,
};

export function applyPublicOpenApiMetadata(document: OpenAPIObject): void {
  document.info.title = PUBLIC_OPENAPI_TITLE;
  document.info.description = PUBLIC_OPENAPI_DESCRIPTION;

  const paths = document.paths as Record<
    string,
    Record<string, OpenApiOperation>
  >;

  for (const routePath of Object.keys(paths)) {
    if (/^\/v\d+\/internal(?:\/|$)/.test(routePath)) {
      delete paths[routePath];
    }
  }

  for (const methods of Object.values(paths)) {
    for (const operation of Object.values(methods)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        !operation.operationId
      ) {
        continue;
      }

      const metadata = PUBLIC_OPERATION_METADATA[operation.operationId];
      if (!metadata) {
        continue;
      }

      operation.summary = metadata.summary;
      operation.description = metadata.description;
      operation['x-mint'] = {
        href: metadata.href,
        metadata: {
          title: metadata.summary,
          sidebarTitle: metadata.sidebarTitle ?? metadata.summary,
          description: metadata.description,
          'og:title': metadata.summary,
          'og:description': metadata.description,
        },
        ...(metadata.content && { content: metadata.content }),
      };

      if (metadata.visibility === 'hidden') {
        operation['x-hidden'] = true;
      } else if (metadata.visibility === 'excluded') {
        operation['x-excluded'] = true;
      }

      if (metadata.codeSamples) {
        operation['x-codeSamples'] = metadata.codeSamples;
      }
    }
  }
}
