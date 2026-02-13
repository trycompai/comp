import { AttachmentsService } from '@/attachments/attachments.service';
import type { AuthContext } from '@/auth/types';
import { db } from '@trycompai/db';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import {
  evidenceFormDefinitionList,
  evidenceFormDefinitions,
  evidenceFormSubmissionSchemaMap,
  evidenceFormTypeSchema,
  type EvidenceFormFieldDefinition,
  type EvidenceFormType,
} from './evidence-forms.definitions';

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const uploadSchema = z.object({
  formType: evidenceFormTypeSchema,
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileData: z.string().min(1),
});

const reviewSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  reason: z.string().trim().optional(),
});

const EVIDENCE_FORM_REVIEWER_ROLES = ['owner', 'admin', 'auditor'] as const;
const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_BASE64_LENGTH = Math.ceil(MAX_UPLOAD_FILE_SIZE_BYTES / 3) * 4;

function toCsvRow(values: string[]): string {
  return values.map((value) => `"${value.replace(/"/g, '""')}"`).join(',');
}

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    if (
      'fileName' in value &&
      typeof value.fileName === 'string' &&
      'downloadUrl' in value &&
      typeof value.downloadUrl === 'string'
    ) {
      return value.downloadUrl;
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }
  if (typeof value === 'symbol') {
    return value.description ?? '';
  }

  return '';
}

function flattenMatrixRows(
  value: unknown,
  field: EvidenceFormFieldDefinition,
): string {
  if (!Array.isArray(value)) {
    return '';
  }

  const columns = Array.isArray(field.columns) ? field.columns : [];
  if (columns.length === 0) {
    return JSON.stringify(value);
  }

  return value
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const rowRecord = row as Record<string, unknown>;
      return columns
        .map((column) => {
          const cellValue = rowRecord[column.key];
          const normalizedValue =
            typeof cellValue === 'string' ? cellValue : '';
          return `${column.label}: ${normalizedValue}`;
        })
        .join(' | ');
    })
    .join(' || ');
}

@Injectable()
export class EvidenceFormsService {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  private requireJwtUser(authContext: AuthContext): string {
    if (authContext.isApiKey || authContext.authType === 'api-key') {
      throw new UnauthorizedException(
        'This endpoint requires JWT authentication and does not support API key authentication',
      );
    }

    if (!authContext.userId) {
      throw new UnauthorizedException('Authenticated user session is required');
    }

    return authContext.userId;
  }

  private requirePrivilegedEvidenceAccess(authContext: AuthContext): string {
    const userId = this.requireJwtUser(authContext);
    const roles = authContext.userRoles ?? [];
    const hasRequiredRole = EVIDENCE_FORM_REVIEWER_ROLES.some((role) =>
      roles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new UnauthorizedException(
        `Access denied. Required one of roles: ${EVIDENCE_FORM_REVIEWER_ROLES.join(', ')}`,
      );
    }

    return userId;
  }

  private decodeBase64File(fileData: string): Buffer {
    const normalized = fileData.trim();
    if (normalized.length === 0 || normalized.length % 4 !== 0) {
      throw new BadRequestException(
        'Invalid file data. Expected base64 string.',
      );
    }

    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Pattern.test(normalized)) {
      throw new BadRequestException(
        'Invalid file data. Expected base64 string.',
      );
    }

    const fileBuffer = Buffer.from(normalized, 'base64');
    if (!fileBuffer.length) {
      throw new BadRequestException('File cannot be empty');
    }

    return fileBuffer;
  }

  listForms() {
    return evidenceFormDefinitionList;
  }

  async getFormStatuses(organizationId: string) {
    const results = await db.evidenceSubmission.groupBy({
      by: ['formType'],
      where: { organizationId },
      _max: { submittedAt: true },
    });

    const statuses: Record<string, { lastSubmittedAt: string | null }> = {};

    for (const form of evidenceFormDefinitionList) {
      const match = results.find((r) => r.formType === form.type);
      statuses[form.type] = {
        lastSubmittedAt: match?._max.submittedAt?.toISOString() ?? null,
      };
    }

    return statuses;
  }

  async getFormWithSubmissions(params: {
    organizationId: string;
    authContext: AuthContext;
    formType: string;
    search?: string;
    limit?: string;
    offset?: string;
  }) {
    const { organizationId, formType } = params;
    this.requirePrivilegedEvidenceAccess(params.authContext);

    const parsedType = evidenceFormTypeSchema.safeParse(formType);
    if (!parsedType.success) {
      throw new BadRequestException('Unsupported form type');
    }

    const parsedQuery = listQuerySchema.safeParse({
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });
    if (!parsedQuery.success) {
      throw new BadRequestException(parsedQuery.error.flatten());
    }
    const query = parsedQuery.data;

    const submissions = await db.evidenceSubmission.findMany({
      where: {
        organizationId,
        formType: parsedType.data,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    const filtered = query.search
      ? submissions.filter((submission) => {
          const searchTarget = JSON.stringify(submission.data).toLowerCase();
          return searchTarget.includes(query.search!.toLowerCase());
        })
      : submissions;

    const paginated = filtered.slice(query.offset, query.offset + query.limit);

    return {
      form: evidenceFormDefinitions[parsedType.data],
      submissions: paginated,
      total: filtered.length,
    };
  }

  async getSubmission(params: {
    organizationId: string;
    authContext: AuthContext;
    formType: string;
    submissionId: string;
  }) {
    this.requirePrivilegedEvidenceAccess(params.authContext);

    const parsedType = evidenceFormTypeSchema.safeParse(params.formType);
    if (!parsedType.success) {
      throw new BadRequestException('Unsupported form type');
    }

    const submission = await db.evidenceSubmission.findFirst({
      where: {
        id: params.submissionId,
        organizationId: params.organizationId,
        formType: parsedType.data,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return {
      form: evidenceFormDefinitions[parsedType.data],
      submission,
    };
  }

  async submitForm(params: {
    organizationId: string;
    formType: string;
    payload: unknown;
    authContext: AuthContext;
  }) {
    const parsedType = evidenceFormTypeSchema.safeParse(params.formType);
    if (!parsedType.success) {
      throw new BadRequestException('Unsupported form type');
    }

    if (!params.authContext.userId) {
      throw new BadRequestException(
        'Authenticated user session is required to submit evidence forms',
      );
    }

    const formDefinition = evidenceFormDefinitions[parsedType.data];
    const nowIso = new Date().toISOString();

    if (!params.payload || typeof params.payload !== 'object') {
      throw new BadRequestException('Submission payload must be an object');
    }

    const payloadObject: Record<string, unknown> = {
      ...(params.payload as Record<string, unknown>),
    };

    if (formDefinition.submissionDateMode === 'auto') {
      payloadObject.submissionDate = nowIso;
    }

    const schema = evidenceFormSubmissionSchemaMap[parsedType.data];
    const parsedPayload = schema.safeParse(payloadObject);
    if (!parsedPayload.success) {
      throw new BadRequestException(parsedPayload.error.flatten());
    }

    return await db.evidenceSubmission.create({
      data: {
        organizationId: params.organizationId,
        formType: parsedType.data,
        submittedById: params.authContext.userId,
        data: parsedPayload.data,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async uploadFile(params: {
    organizationId: string;
    authContext: AuthContext;
    payload: unknown;
  }) {
    if (!params.authContext.userId) {
      throw new BadRequestException(
        'Authenticated user session is required to upload evidence files',
      );
    }

    const parsed = uploadSchema.safeParse(params.payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (parsed.data.fileData.length > MAX_UPLOAD_BASE64_LENGTH) {
      throw new BadRequestException(
        `File exceeds the ${MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      );
    }

    const fileBuffer = this.decodeBase64File(parsed.data.fileData);
    if (fileBuffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      );
    }

    const fileKey = await this.attachmentsService.uploadToS3(
      fileBuffer,
      parsed.data.fileName,
      parsed.data.fileType,
      params.organizationId,
      'evidence-forms',
      parsed.data.formType,
    );

    const downloadUrl =
      await this.attachmentsService.getPresignedDownloadUrl(fileKey);

    return {
      fileName: parsed.data.fileName,
      fileKey,
      downloadUrl,
    };
  }

  async exportCsv(params: {
    organizationId: string;
    formType: string;
    authContext: AuthContext;
  }) {
    this.requirePrivilegedEvidenceAccess(params.authContext);

    const parsedType = evidenceFormTypeSchema.safeParse(params.formType);
    if (!parsedType.success) {
      throw new BadRequestException('Unsupported form type');
    }

    const formType: EvidenceFormType = parsedType.data;
    const form = evidenceFormDefinitions[formType];

    const submissions = await db.evidenceSubmission.findMany({
      where: {
        organizationId: params.organizationId,
        formType,
      },
      include: {
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    if (submissions.length === 0) {
      throw new BadRequestException(
        'No submissions available for export for this form',
      );
    }

    const headers = [
      'submissionId',
      'submissionDate',
      'submittedByName',
      'submittedByEmail',
      ...form.fields
        .filter((field) => field.key !== 'submissionDate')
        .map((field) => field.key),
    ];

    const rows = await Promise.all(
      submissions.map(async (submission) => {
        const data = submission.data as Record<string, unknown>;
        const fieldValues = await Promise.all(
          form.fields
            .filter((field) => field.key !== 'submissionDate')
            .map(async (field) => {
              const rawValue = data[field.key];
              if (
                rawValue &&
                typeof rawValue === 'object' &&
                'fileKey' in rawValue &&
                typeof rawValue.fileKey === 'string'
              ) {
                const signedUrl =
                  await this.attachmentsService.getPresignedDownloadUrl(
                    rawValue.fileKey,
                  );
                return signedUrl;
              }
              if (field.type === 'matrix') {
                return flattenMatrixRows(rawValue, field);
              }
              return flattenValue(rawValue);
            }),
        );

        return [
          submission.id,
          typeof data.submissionDate === 'string'
            ? data.submissionDate
            : submission.submittedAt.toISOString(),
          submission.submittedBy?.name ?? '',
          submission.submittedBy?.email ?? '',
          ...fieldValues,
        ];
      }),
    );

    const csvLines = [toCsvRow(headers), ...rows.map((row) => toCsvRow(row))];
    return csvLines.join('\n');
  }

  async reviewSubmission(params: {
    organizationId: string;
    formType: string;
    submissionId: string;
    payload: unknown;
    authContext: AuthContext;
  }) {
    const parsedType = evidenceFormTypeSchema.safeParse(params.formType);
    if (!parsedType.success) {
      throw new BadRequestException('Unsupported form type');
    }

    const reviewerUserId = this.requirePrivilegedEvidenceAccess(
      params.authContext,
    );

    const parsed = reviewSchema.safeParse(params.payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (parsed.data.action === 'rejected' && !parsed.data.reason) {
      throw new BadRequestException(
        'A reason is required when rejecting a submission',
      );
    }

    const submission = await db.evidenceSubmission.findFirst({
      where: {
        id: params.submissionId,
        organizationId: params.organizationId,
        formType: parsedType.data,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return await db.evidenceSubmission.update({
      where: { id: params.submissionId },
      data: {
        status: parsed.data.action,
        reviewedById: reviewerUserId,
        reviewedAt: new Date(),
        reviewReason: parsed.data.reason ?? null,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getMySubmissions(params: {
    organizationId: string;
    authContext: AuthContext;
    formType?: string;
  }) {
    const userId = this.requireJwtUser(params.authContext);

    const where: Record<string, unknown> = {
      organizationId: params.organizationId,
      submittedById: userId,
    };

    if (params.formType) {
      const parsedType = evidenceFormTypeSchema.safeParse(params.formType);
      if (!parsedType.success) {
        throw new BadRequestException('Unsupported form type');
      }
      where.formType = parsedType.data;
    }

    return await db.evidenceSubmission.findMany({
      where,
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async getPendingSubmissionCount(params: {
    organizationId: string;
    authContext: AuthContext;
  }) {
    const userId = this.requireJwtUser(params.authContext);

    const count = await db.evidenceSubmission.count({
      where: {
        organizationId: params.organizationId,
        submittedById: userId,
        status: 'pending',
      },
    });

    return { count };
  }
}
