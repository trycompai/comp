import { Injectable, NotFoundException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BUCKET_NAME, getSignedUrl, s3Client } from '@/app/s3';
import { db } from '@db';

@Injectable()
export class BrowserbaseScreenshotService {
  private get s3Client(): S3Client {
    if (!s3Client) {
      throw new Error(
        'S3 client not configured — set APP_AWS_ACCESS_KEY_ID, APP_AWS_SECRET_ACCESS_KEY, APP_AWS_REGION, APP_AWS_BUCKET_NAME in apps/api/.env',
      );
    }
    return s3Client;
  }

  private get bucketName(): string {
    if (!BUCKET_NAME) {
      throw new Error(
        'APP_AWS_BUCKET_NAME is not set — configure S3 credentials in apps/api/.env',
      );
    }
    return BUCKET_NAME;
  }

  async uploadScreenshot({
    organizationId,
    automationId,
    runId,
    base64Screenshot,
  }: {
    organizationId: string;
    automationId: string;
    runId: string;
    base64Screenshot: string;
  }): Promise<string> {
    const buffer = Buffer.from(base64Screenshot, 'base64');
    const key = `browser-automations/${organizationId}/${automationId}/${runId}.jpg`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      }),
    );

    return key;
  }

  async getPresignedUrl({
    key,
    expiresIn,
    responseContentDisposition,
  }: {
    key: string;
    expiresIn?: number;
    responseContentDisposition?: string;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: responseContentDisposition,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresIn ?? 3600,
    });
  }

  async getScreenshotRedirectUrl(input: {
    runId: string;
    organizationId: string;
    download?: boolean;
  }): Promise<string> {
    const { runId, organizationId, download } = input;

    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
      include: { automation: { include: { task: true } } },
    });

    if (!run || !run.screenshotUrl) {
      throw new NotFoundException('Screenshot not found');
    }

    if (run.automation.task.organizationId !== organizationId) {
      throw new NotFoundException('Screenshot not found');
    }

    const responseContentDisposition = download
      ? `attachment; filename="screenshot-${runId}.jpg"`
      : undefined;

    return this.getPresignedUrl({
      key: run.screenshotUrl,
      responseContentDisposition,
    });
  }
}
