import { logger } from '@/utils/logger';
import { s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { client as kv } from '@comp/kv';
import { type NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET handler for direct browser downloads using token
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get('token');
  const os = searchParams.get('os');

  if (!os) {
    return new NextResponse('Missing OS', { status: 400 });
  }

  if (!token) {
    return new NextResponse('Missing download token', { status: 400 });
  }

  // Retrieve download info from KV store
  const downloadInfo = await kv.get(`download:${token}`);

  if (!downloadInfo) {
    return new NextResponse('Invalid or expired download token', { status: 403 });
  }

  // Delete token after retrieval (one-time use)
  await kv.del(`download:${token}`);

  // Hardcoded device marker paths used by the setup scripts
  const fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME;

  if (!fleetBucketName) {
    return new NextResponse('Server configuration error', { status: 500 });
  }

  // For macOS, serve the DMG directly. For Windows, create a zip with script and installer.
  if (os === 'macos' || os === 'macos-intel') {
    try {
      // Direct DMG download for macOS
      const macosPackageFilename =
        os === 'macos' ? 'Comp AI Agent-1.0.0-arm64.dmg' : 'Comp AI Agent-1.0.0.dmg';
      const packageKey = `macos/${macosPackageFilename}`;

      const getObjectCommand = new GetObjectCommand({
        Bucket: fleetBucketName,
        Key: packageKey,
      });

      const s3Response = await s3Client.send(getObjectCommand);

      if (!s3Response.Body) {
        return new NextResponse('DMG file not found', { status: 404 });
      }

      // Convert S3 stream to Web Stream for NextResponse
      const s3Stream = s3Response.Body as Readable;
      const webStream = Readable.toWeb(s3Stream) as unknown as ReadableStream;

      // Return streaming response with headers that trigger browser download
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'application/x-apple-diskimage',
          'Content-Disposition': `attachment; filename="${macosPackageFilename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (error) {
      logger('Error downloading macOS DMG', { error });
      return new NextResponse('Failed to download macOS agent', { status: 500 });
    }
  }

  // Windows flow: Generate script and create zip  const fleetDevicePath = fleetDevicePathWindows;
  try {
    const windowsPackageFilename = 'Comp AI Agent 1.0.0.exe';
    const packageKey = `windows/${windowsPackageFilename}`;

    const getObjectCommand = new GetObjectCommand({
      Bucket: fleetBucketName,
      Key: packageKey,
    });

    const s3Response = await s3Client.send(getObjectCommand);

    if (!s3Response.Body) {
      return new NextResponse('Executable file not found', { status: 404 });
    }

    // Convert S3 stream to Web Stream for NextResponse
    const s3Stream = s3Response.Body as Readable;
    const webStream = Readable.toWeb(s3Stream) as unknown as ReadableStream;

    // Return streaming response with headers that trigger browser download
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${windowsPackageFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    logger('Error creating agent download', { error });
    return new NextResponse('Failed to create download', { status: 500 });
  }
}
