import { s3Client } from '@/utils/s3';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { type NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const S3_PREFIX = 'device-agent/updates';

/** Allowed file extensions for auto-update files */
const ALLOWED_EXTENSIONS = new Set([
  '.yml',
  '.zip',
  '.exe',
  '.blockmap',
  '.AppImage',
  '.dmg',
]);

const CONTENT_TYPES: Record<string, string> = {
  '.yml': 'text/yaml',
  '.zip': 'application/zip',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
  '.AppImage': 'application/octet-stream',
  '.dmg': 'application/x-apple-diskimage',
};

function getExtension(filename: string): string {
  // Handle .AppImage specially (not a dotted extension from lastIndexOf perspective)
  if (filename.endsWith('.AppImage')) return '.AppImage';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex) : '';
}

function isValidFilename(filename: string): boolean {
  // Block path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  const ext = getExtension(filename);
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!isValidFilename(filename)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const bucketName = process.env.FLEET_AGENT_BUCKET_NAME;
  if (!bucketName) {
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const key = `${S3_PREFIX}/${filename}`;
  const ext = getExtension(filename);
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return new NextResponse('Not found', { status: 404 });
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    };

    if (typeof s3Response.ContentLength === 'number') {
      headers['Content-Length'] = s3Response.ContentLength.toString();
    }

    const s3Stream = s3Response.Body as Readable;
    const webStream = Readable.toWeb(s3Stream) as unknown as ReadableStream;

    return new NextResponse(webStream, { headers });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('Error serving update file:', { key, error });
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!isValidFilename(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const bucketName = process.env.FLEET_AGENT_BUCKET_NAME;
  if (!bucketName) {
    return new NextResponse(null, { status: 500 });
  }

  const key = `${S3_PREFIX}/${filename}`;
  const ext = getExtension(filename);
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  try {
    const command = new HeadObjectCommand({ Bucket: bucketName, Key: key });
    const s3Response = await s3Client.send(command);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    };

    if (typeof s3Response.ContentLength === 'number') {
      headers['Content-Length'] = s3Response.ContentLength.toString();
    }

    return new NextResponse(null, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
