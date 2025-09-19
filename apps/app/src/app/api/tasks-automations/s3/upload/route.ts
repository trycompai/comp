import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({ region: 'us-east-1' });

export async function POST(req: Request) {
  try {
    const { orgId, taskId, content, type } = await req.json();

    if (!orgId || !taskId || !content) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Determine the S3 key based on the type
    const s3Key = type === 'lambda' ? `${orgId}/${taskId}.js` : `${orgId}/${taskId}.${type}.js`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: 'comp-testing-lambda-tasks',
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
      bucket: 'comp-testing-lambda-tasks',
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
