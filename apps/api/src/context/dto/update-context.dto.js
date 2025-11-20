"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContextDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_context_dto_1 = require("./create-context.dto");
class UpdateContextDto extends (0, swagger_1.PartialType)(create_context_dto_1.CreateContextDto) {
}
exports.UpdateContextDto = UpdateContextDto;
//# sourceMappingURL=update-context.dto.js.map