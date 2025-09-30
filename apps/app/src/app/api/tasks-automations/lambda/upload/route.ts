import { s3Client } from '@/app/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orgId, taskId, content }: { orgId: string; taskId: string; content: string } =
      await req.json();
    if (!orgId || !taskId || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing orgId, taskId or content' }, { status: 400 });
    }

    const resolvedBucket = process.env.TASKS_AUTOMATION_BUCKET;
    const key = `${orgId}/${taskId}.js`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
        Body: Buffer.from(content, 'utf8'),
        ContentType: 'application/javascript; charset=utf-8',
        Metadata: {
          runtime: 'nodejs20.x',
          handler: 'task-fn',
          language: 'javascript',
          entry: 'task.js',
          packaging: 'task-fn',
          filename: key,
        },
      }),
    );

    return NextResponse.json({ ok: true, bucket: resolvedBucket, key });
  } catch (error) {
    console.error('Error uploading code to S3', error);
    return NextResponse.json({ error: 'Failed to upload to S3' }, { status: 500 });
  }
}
