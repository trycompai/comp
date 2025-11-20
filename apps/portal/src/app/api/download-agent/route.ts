import { logger } from '@/utils/logger';
import { s3Client } from '@/utils/s3';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { client as kv } from '@comp/kv';
import { type NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

import { MAC_APPLE_SILICON_FILENAME, MAC_INTEL_FILENAME, WINDOWS_FILENAME } from './constants';
import type { SupportedOS } from './types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DownloadTokenInfo {
  orgId: string;
  employeeId: string;
  userId: string;
  os: SupportedOS;
  createdAt: number;
}

interface DownloadTarget {
  key: string;
  filename: string;
  contentType: string;
}

const getDownloadTarget = (os: SupportedOS): DownloadTarget => {
  if (os === 'windows') {
    return {
      key: `windows/${WINDOWS_FILENAME}`,
      filename: WINDOWS_FILENAME,
      contentType: 'application/octet-stream',
    };
  }

  const isAppleSilicon = os === 'macos';
  const filename = isAppleSilicon ? MAC_APPLE_SILICON_FILENAME : MAC_INTEL_FILENAME;

  return {
    key: `macos/${filename}`,
    filename,
    contentType: 'application/x-apple-diskimage',
  };
};

const buildResponseHeaders = (
  target: DownloadTarget,
  contentLength?: number | null,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': target.contentType,
    'Content-Disposition': `attachment; filename="${target.filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Accel-Buffering': 'no',
  };

  if (typeof contentLength === 'number' && Number.isFinite(contentLength)) {
    headers['Content-Length'] = contentLength.toString();
  }

  return headers;
};

const getDownloadToken = async (token: string): Promise<DownloadTokenInfo | null> => {
  const info = await kv.get<DownloadTokenInfo>(`download:${token}`);
  return info ?? null;
};

const ensureBucket = (): string | null => {
  const bucket = process.env.FLEET_AGENT_BUCKET_NAME;
  return bucket ?? null;
};

const handleDownload = async (req: NextRequest, isHead: boolean) => {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing download token', { status: 400 });
  }

  const downloadInfo = await getDownloadToken(token);

  if (!downloadInfo) {
    return new NextResponse('Invalid or expired download token', { status: 403 });
  }

  const fleetBucketName = ensureBucket();

  if (!fleetBucketName) {
    logger('Device agent download misconfigured: missing bucket');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const target = getDownloadTarget(downloadInfo.os);

  try {
    if (isHead) {
      const headCommand = new HeadObjectCommand({
        Bucket: fleetBucketName,
        Key: target.key,
      });

      const headResult = await s3Client.send(headCommand);

      return new NextResponse(null, {
        headers: buildResponseHeaders(target, headResult.ContentLength ?? null),
      });
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: fleetBucketName,
      Key: target.key,
    });

    const s3Response = await s3Client.send(getObjectCommand);

    if (!s3Response.Body) {
      return new NextResponse('Installer file not found', { status: 404 });
    }

    await kv.del(`download:${token}`);

    const s3Stream = s3Response.Body as Readable;
    const webStream = Readable.toWeb(s3Stream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: buildResponseHeaders(target, s3Response.ContentLength ?? null),
    });
  } catch (error) {
    logger('Error serving device agent download', {
      error,
      token,
      os: downloadInfo.os,
      method: isHead ? 'HEAD' : 'GET',
    });

    return new NextResponse('Failed to download agent', { status: 500 });
  }
};

export async function GET(req: NextRequest) {
  return handleDownload(req, false);
}

export async function HEAD(req: NextRequest) {
  return handleDownload(req, true);
}
