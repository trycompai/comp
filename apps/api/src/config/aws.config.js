"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsConfig = void 0;
const config_1 = require("@nestjs/config");
const zod_1 = require("zod");
const awsConfigSchema = zod_1.z.object({
    region: zod_1.z.string().default('us-east-1'),
    accessKeyId: zod_1.z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
    secretAccessKey: zod_1.z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
    bucketName: zod_1.z.string().min(1, 'AWS_BUCKET_NAME is required'),
});
exports.awsConfig = (0, config_1.registerAs)('aws', () => {
    const config = {
        region: process.env.APP_AWS_REGION || 'us-east-1',
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
        bucketName: process.env.APP_AWS_BUCKET_NAME || '',
    };
    const result = awsConfigSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`AWS configuration validation failed: ${result.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`);
    }
    return result.data;
});
//# sourceMappingURL=aws.config.js.map