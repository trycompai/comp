"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.betterAuthConfig = void 0;
const config_1 = require("@nestjs/config");
const zod_1 = require("zod");
const betterAuthConfigSchema = zod_1.z.object({
    url: zod_1.z.string().url('BETTER_AUTH_URL must be a valid URL'),
});
exports.betterAuthConfig = (0, config_1.registerAs)('betterAuth', () => {
    const url = process.env.BETTER_AUTH_URL;
    if (!url) {
        throw new Error('BETTER_AUTH_URL environment variable is required');
    }
    const config = { url };
    const result = betterAuthConfigSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Better Auth configuration validation failed: ${result.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`);
    }
    return result.data;
});
//# sourceMappingURL=better-auth.config.js.map