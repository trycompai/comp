import { serverApi } from '@/lib/api-server';

export interface PolicyBulkUploadFile {
  /** Original file name, e.g. "Access Control Policy.pdf". */
  fileName: string;
  /** MIME type of the file (expected to be application/pdf). */
  fileType: string;
  /** Base64-encoded file contents, without the `data:` URL prefix. */
  fileData: string;
}

export interface PolicyBulkUploadItemResult {
  fileName: string;
  status: 'created' | 'failed';
  /**
   * Set once the policy record has been created — present even when the
   * subsequent PDF attach fails, so the caller can point the user at the
   * half-created draft.
   */
  policyId?: string;
  error?: string;
  httpStatus?: number;
}

export interface PolicyBulkUploadResult {
  results: PolicyBulkUploadItemResult[];
  createdCount: number;
  failedCount: number;
}

/** Derive a policy name from a file name by stripping the `.pdf` extension. */
function derivePolicyName(fileName: string): string {
  const stripped = fileName.replace(/\.pdf$/i, '').trim();
  return stripped || fileName;
}

/**
 * Bulk-imports pre-existing policy documents (e.g. when migrating from another
 * platform). For each uploaded PDF it reuses the existing single-policy
 * pipeline: create a draft policy with empty editor content via
 * `POST /v1/policies`, then attach the uploaded document via
 * `POST /v1/policies/:id/pdf` (which flips the policy to PDF display format).
 *
 * Tenant isolation and RBAC (`policy:create` / `policy:update`) are enforced by
 * those NestJS endpoints — this helper only orchestrates them and never touches
 * the database directly. Files are processed independently so a single bad
 * document doesn't abort the rest of the migration; outcomes are reported per
 * file.
 */
export async function bulkUploadPoliciesViaApi({
  files,
}: {
  files: PolicyBulkUploadFile[];
}): Promise<PolicyBulkUploadResult> {
  const results: PolicyBulkUploadItemResult[] = [];

  for (const file of files) {
    const createRes = await serverApi.post<{ id: string }>('/v1/policies', {
      name: derivePolicyName(file.fileName),
      content: [],
    });

    if (createRes.error || !createRes.data?.id) {
      results.push({
        fileName: file.fileName,
        status: 'failed',
        error: createRes.error || 'Failed to create policy',
        httpStatus: createRes.status,
      });
      continue;
    }

    const policyId = createRes.data.id;
    const attachRes = await serverApi.post(`/v1/policies/${policyId}/pdf`, {
      fileName: file.fileName,
      fileType: file.fileType,
      fileData: file.fileData,
    });

    if (attachRes.error) {
      results.push({
        fileName: file.fileName,
        status: 'failed',
        policyId,
        error: attachRes.error,
        httpStatus: attachRes.status,
      });
      continue;
    }

    results.push({ fileName: file.fileName, status: 'created', policyId });
  }

  const createdCount = results.filter((r) => r.status === 'created').length;
  return {
    results,
    createdCount,
    failedCount: results.length - createdCount,
  };
}
