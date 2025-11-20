"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRiskDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_risk_dto_1 = require("./create-risk.dto");
class UpdateRiskDto extends (0, swagger_1.PartialType)(create_risk_dto_1.CreateRiskDto) {
}
exports.UpdateRiskDto = UpdateRiskDto;
//# sourceMappingURL=update-risk.dto.js.map