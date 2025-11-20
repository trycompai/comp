"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_BODIES = void 0;
const create_risk_dto_1 = require("../dto/create-risk.dto");
const update_risk_dto_1 = require("../dto/update-risk.dto");
exports.RISK_BODIES = {
    createRisk: {
        description: 'Risk creation data',
        type: create_risk_dto_1.CreateRiskDto,
    },
    updateRisk: {
        description: 'Risk update data',
        type: update_risk_dto_1.UpdateRiskDto,
    },
};
//# sourceMappingURL=risk-bodies.js.map