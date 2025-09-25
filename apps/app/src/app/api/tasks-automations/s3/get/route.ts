import { s3Client } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Get object from S3
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.TASKS_AUTOMATION_BUCKET || 'comp-testing-lambda-tasks',
        Key: key,
      }),
    );

    if (!Body) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const content = await Body.transformToString();

    return NextResponse.json({
      success: true,
      content,
      key,
    });
  } catch (error) {
    console.error('Error fetching from S3:', error);
    return NextResponse.json(
      { error: 'Failed to fetch script', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
