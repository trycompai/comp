import { logger } from '@/utils/logger';
import { s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { client as kv } from '@comp/kv';
import archiver from 'archiver';
import { type NextRequest, NextResponse } from 'next/server';
import { PassThrough, Readable } from 'stream';
import {
  generateMacScript,
  generateWindowsScript,
  getPackageFilename,
  getReadmeContent,
  getScriptFilename,
} from './scripts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET handler for direct browser downloads using token
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get('token');

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

  const { orgId, employeeId, os } = downloadInfo as {
    orgId: string;
    employeeId: string;
    userId: string;
    os: 'macos' | 'windows';
  };

  // Hardcoded device marker paths used by the setup scripts
  const fleetDevicePathMac = '/Users/Shared/.fleet';
  const fleetDevicePathWindows = 'C:\\ProgramData\\CompAI\\Fleet';
  const fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME;

  if (!fleetBucketName) {
    return new NextResponse('Server configuration error', { status: 500 });
  }

  // Generate OS-specific script
  const fleetDevicePath = os === 'macos' ? fleetDevicePathMac : fleetDevicePathWindows;
  const script =
    os === 'macos'
      ? generateMacScript({ orgId, employeeId, fleetDevicePath })
      : generateWindowsScript({ orgId, employeeId, fleetDevicePath });

  try {
    // Create a passthrough stream for the response
    const passThrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Pipe archive to passthrough
    archive.pipe(passThrough);

    // Robust error handling for staging/prod reliability
    archive.on('error', (err) => {
      logger('archiver_error', { message: err?.message, stack: (err as Error)?.stack });
      passThrough.destroy(err as Error);
    });
    archive.on('warning', (warn) => {
      logger('archiver_warning', { message: (warn as Error)?.message });
    });
    passThrough.on('error', (err) => {
      logger('download_stream_error', {
        message: (err as Error)?.message,
        stack: (err as Error)?.stack,
      });
    });

    // Add script file
    const scriptFilename = getScriptFilename(os);
    archive.append(script, { name: scriptFilename, mode: 0o755 });

    // Add README
    const readmeContent = getReadmeContent(os);
    archive.append(readmeContent, { name: 'README.txt' });

    // Get package from S3 and stream it
    const packageFilename = getPackageFilename(os);
    const macosPackageFilename = 'Comp AI Agent-1.0.0-arm64.dmg';
    const windowsPackageFilename = 'fleet-osquery.msi';
    const packageKey = `${os}/${os === 'macos' ? macosPackageFilename : windowsPackageFilename}`;

    const getObjectCommand = new GetObjectCommand({
      Bucket: fleetBucketName,
      Key: packageKey,
    });

    const s3Response = await s3Client.send(getObjectCommand);

    if (s3Response.Body) {
      const s3Stream = s3Response.Body as Readable;
      s3Stream.on('error', (err) => {
        logger('s3_stream_error', {
          message: (err as Error)?.message,
          stack: (err as Error)?.stack,
        });
        passThrough.destroy(err as Error);
      });
      archive.append(s3Stream, { name: packageFilename, store: true });
    }

    // Finalize the archive
    archive.finalize();

    // Convert Node.js stream to Web Stream for NextResponse
    const webStream = Readable.toWeb(passThrough) as unknown as ReadableStream;

    // Return streaming response with headers that trigger browser download
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="compai-device-agent-${os}.zip"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    logger('Error creating agent download', { error });
    return new NextResponse('Failed to create download', { status: 500 });
  }
}
