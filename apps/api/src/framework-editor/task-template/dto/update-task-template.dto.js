"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTaskTemplateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_task_template_dto_1 = require("./create-task-template.dto");
class UpdateTaskTemplateDto extends (0, swagger_1.PartialType)(create_task_template_dto_1.CreateTaskTemplateDto) {
}
exports.UpdateTaskTemplateDto = UpdateTaskTemplateDto;
//# sourceMappingURL=update-task-template.dto.js.map