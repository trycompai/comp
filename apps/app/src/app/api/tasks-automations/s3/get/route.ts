import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({ region: 'us-east-1' });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Get object from S3
    const { Body } = await s3.send(
      new GetObjectCommand({
        Bucket: 'comp-testing-lambda-tasks',
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
