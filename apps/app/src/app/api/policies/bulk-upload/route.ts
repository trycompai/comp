import {
  bulkUploadPoliciesViaApi,
  type PolicyBulkUploadFile,
} from '@/lib/policies-bulk-upload';
import { NextRequest, NextResponse } from 'next/server';

/** Cap the batch size so a single request can't buffer an unbounded payload. */
const MAX_FILES = 25;

function isValidFile(file: unknown): file is PolicyBulkUploadFile {
  const f = file as Record<string, unknown>;
  return (
    typeof f === 'object' &&
    f !== null &&
    typeof f.fileName === 'string' &&
    typeof f.fileType === 'string' &&
    typeof f.fileData === 'string'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files = body.files as unknown;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required.' },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload at most ${MAX_FILES} policies at a time.` },
        { status: 400 },
      );
    }

    if (!files.every(isValidFile)) {
      return NextResponse.json(
        { error: 'Each file must include fileName, fileType, and fileData.' },
        { status: 400 },
      );
    }

    const result = await bulkUploadPoliciesViaApi({ files });

    // Nothing was created — surface the underlying failure status (e.g. 401/403
    // from the guarded NestJS endpoints) rather than a misleading 200.
    if (result.createdCount === 0) {
      const failureStatus =
        result.results.find((r) => r.httpStatus)?.httpStatus ?? 500;
      return NextResponse.json(
        {
          ...result,
          error: result.results[0]?.error ?? 'Failed to upload policies.',
        },
        { status: failureStatus },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[policies/bulk-upload] Failed to process upload:', error);
    return NextResponse.json(
      { error: 'Failed to upload policies.' },
      { status: 500 },
    );
  }
}
