import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const awsConfigSchema = z.object({
  region: z.string().default('us-east-1'),
  accessKeyId: z.string().min(1, 'API_AWS_ACCESS_KEY_ID is required'),
  secretAccessKey: z.string().min(1, 'API_AWS_SECRET_ACCESS_KEY is required'),
  bucketName: z.string().min(1, 'API_AWS_BUCKET_NAME is required'),
});

export type AwsConfig = z.infer<typeof awsConfigSchema>;

export const awsConfig = registerAs('aws', (): AwsConfig => {
  const config = {
    region: process.env.API_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.API_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.API_AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.API_AWS_BUCKET_NAME || '',
  };

  // Validate configuration at startup
  const result = awsConfigSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `AWS configuration validation failed: ${result.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`,
    );
  }

  return result.data;
});
