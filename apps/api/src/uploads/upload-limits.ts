/**
 * Shared upload size limits for both upload paths:
 *  - inline base64 `fileData` (web UI / direct callers), capped on the DTO via
 *    MAX_UPLOAD_BASE64_LENGTH so an oversized payload is rejected at validation
 *    time (before it is decoded);
 *  - presigned `s3Key` (AI/MCP clients), capped in UploadsService via a HEAD
 *    request before the object is downloaded.
 *
 * Keep these as the single source of truth so the DTO caps, the service caps,
 * and the web UI dropzone limits can't drift apart.
 */

/** Maximum decoded file size accepted by any upload path (100 MiB). */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/**
 * Maximum length of a base64-encoded inline `fileData` field.
 *
 * Base64 inflates bytes by 4/3 (4 chars per 3 bytes, padded), so this is the
 * encoded length of a MAX_UPLOAD_BYTES file: `4 * ceil(bytes / 3)` = 139,810,136.
 *
 * IMPORTANT: it must be the base64 length of the FULL byte limit, not the byte
 * limit itself. The previous literal (134_217_728 = 128 MiB of characters) only
 * permitted ~96 MiB of decoded data, so a 96–100 MiB file the UI dropzone and
 * the service both allow was wrongly rejected with a 400.
 */
export const MAX_UPLOAD_BASE64_LENGTH = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4;
