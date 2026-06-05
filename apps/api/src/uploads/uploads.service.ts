import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  BUCKET_NAME,
  getObjectAsBuffer,
  getObjectContentLength,
  getSignedUrl,
  s3Client,
} from '../app/s3';
import {
  CreateUploadUrlDto,
  UploadUrlResponseDto,
} from './dto/create-upload-url.dto';
import { MAX_UPLOAD_BYTES } from './upload-limits';

/**
 * ============================================================================
 * General presigned-upload mechanism — READ THIS BEFORE ADDING FILE UPLOADS.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Our MCP server (and any LLM agent) calls the API over JSON-RPC. Sending a
 * file as base64 inside a request/tool argument forces the model to emit the
 * entire file token-by-token — which is catastrophically slow, burns tokens,
 * and overflows the context window. base64-in-the-body is an anti-pattern for
 * agent-driven uploads.
 *
 * THE PATTERN (use this for every new file-upload feature)
 * --------------------------------------------------------
 *   1. Client calls  POST /v1/uploads/presign  -> { uploadUrl, s3Key }
 *   2. Client PUTs the raw bytes directly to `uploadUrl` (straight to S3 —
 *      the bytes never pass through this API or the LLM).
 *   3. Client calls the FEATURE endpoint with the `s3Key` (NOT base64 data).
 *   4. The feature service reads the bytes back with `getObjectAsBuffer(...)`
 *      (see app/s3.ts) and processes them server-side.
 *
 * This keeps binary transfer out of the LLM entirely and is reusable across
 * features (questionnaire, policy PDF, evidence, attachments, ...). To onboard
 * a new feature: add a `UploadPurpose`, accept an optional `s3Key` on the
 * feature DTO, and in the feature service fetch + validate the key (it must be
 * scoped to the caller's org — see `assertKeyBelongsToOrg`).
 *
 * NOTE: the existing base64/multipart upload paths are intentionally left in
 * place for the web UI (browsers handle binary natively). This mechanism is
 * additive — it does not replace them.
 * ============================================================================
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  /** Seconds a presigned upload URL stays valid. Short enough to limit exposure
   * of a leaked URL, long enough for a real upload. */
  private static readonly UPLOAD_URL_TTL_SECONDS = 900;

  /**
   * Default ceiling for files read back from S3 via the presigned flow. A plain
   * presigned PUT cannot enforce a size limit, so this is the backstop that
   * stops an oversized upload from being loaded into memory. Shares the 100MB
   * limit the feature services / DTOs enforce (see upload-limits.ts).
   */
  static readonly DEFAULT_MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES;

  /**
   * Generate a presigned S3 PUT URL plus the org-scoped key the file will land
   * at. The key prefix is always `{organizationId}/uploads/{purpose}/` so files
   * cannot be written outside the caller's org and stay organized by feature.
   */
  async createUploadUrl(
    organizationId: string,
    dto: CreateUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    if (!s3Client || !BUCKET_NAME) {
      throw new BadRequestException('File storage is not configured');
    }

    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${organizationId}/uploads/${dto.purpose}/${Date.now()}-${sanitizedFileName}`;

    // NOTE: ContentType is deliberately NOT signed into the URL. If it were,
    // the uploader's PUT would have to send a byte-for-byte matching
    // `Content-Type` header or S3 rejects it with SignatureDoesNotMatch. Agent
    // clients (the MCP server) issue a plain PUT and can't reliably set that
    // header, so we keep the signature content-type agnostic. Nothing reads the
    // stored object's content-type back — feature endpoints use the `fileType`
    // they're given, and PDF previews force the type on download — so omitting
    // it here is safe.
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const expiresIn = UploadsService.UPLOAD_URL_TTL_SECONDS;
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    this.logger.log(
      `Issued presigned upload URL for org ${organizationId} (purpose=${dto.purpose})`,
    );

    return { uploadUrl, s3Key, expiresIn };
  }

  /**
   * Read a previously-uploaded file back from S3 as base64, for feature
   * services that still process content as base64 (e.g. questionnaire parsing).
   *
   * SECURITY: the key MUST belong to the caller's org. Callers should pass the
   * authenticated organizationId; this method rejects keys outside that prefix
   * so one org cannot reference another org's uploaded file.
   */
  async readUploadAsBase64(
    organizationId: string,
    s3Key: string,
    maxBytes: number = UploadsService.DEFAULT_MAX_UPLOAD_BYTES,
  ): Promise<string> {
    if (!BUCKET_NAME) {
      throw new BadRequestException('File storage is not configured');
    }
    this.assertKeyBelongsToOrg(organizationId, s3Key);

    // Reject oversized uploads via a HEAD request BEFORE downloading and
    // base64-encoding the object. A presigned PUT can't cap upload size, so
    // without this an authenticated client could PUT a multi-GB file and have
    // the API load it fully into memory (buffer + ~1.33x base64) and OOM.
    let contentLength: number | undefined;
    try {
      contentLength = await getObjectContentLength(BUCKET_NAME, s3Key);
    } catch (error) {
      this.logger.warn(
        `Failed to stat uploaded file ${s3Key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new BadRequestException(
        'No file found at the given s3Key — upload it via the presigned URL first.',
      );
    }

    if (contentLength !== undefined && contentLength > maxBytes) {
      throw new BadRequestException(
        `File exceeds the maximum allowed size of ${Math.floor(
          maxBytes / (1024 * 1024),
        )}MB`,
      );
    }

    try {
      const buffer = await getObjectAsBuffer(BUCKET_NAME, s3Key);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.warn(
        `Failed to read uploaded file ${s3Key}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new BadRequestException(
        'No file found at the given s3Key — upload it via the presigned URL first.',
      );
    }
  }

  /**
   * Guard against cross-org key access. Presigned keys are always prefixed with
   * `{organizationId}/uploads/`, so anything else is rejected.
   */
  assertKeyBelongsToOrg(organizationId: string, s3Key: string): void {
    const expectedPrefix = `${organizationId}/uploads/`;
    if (!s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        's3Key does not belong to this organization. Use the exact s3Key returned by /v1/uploads/presign.',
      );
    }
  }
}
