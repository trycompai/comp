"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        try {
            const parsedValue = this.schema.parse(value);
            return parsedValue;
        }
        catch (error) {
            throw new common_1.BadRequestException('Validation failed');
        }
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
//# sourceMappingURL=zod-validation.pipe.js.map