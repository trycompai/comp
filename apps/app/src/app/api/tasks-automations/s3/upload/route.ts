import { s3Client } from '@/app/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { orgId, taskId, content, type } = await req.json();

    if (!orgId || !taskId || !content) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Determine the S3 key based on the type
    const s3Key = type === 'lambda' ? `${orgId}/${taskId}.js` : `${orgId}/${taskId}.${type}.js`;
    const bucket = process.env.TASKS_AUTOMATION_BUCKET;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: content,
        ContentType: 'application/javascript',
        Metadata: {
          orgId,
          taskId,
          type: type || 'lambda',
          uploadedAt: new Date().toISOString(),
        },
      }),
    );

    console.log(`Successfully uploaded ${s3Key} to S3`);

    return NextResponse.json({
      success: true,
      bucket: bucket,
      key: s3Key,
      message: 'Script uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return NextResponse.json(
      { error: 'Failed to upload script to S3', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
