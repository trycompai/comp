"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLICY_BODIES = void 0;
const create_policy_dto_1 = require("../dto/create-policy.dto");
const update_policy_dto_1 = require("../dto/update-policy.dto");
exports.POLICY_BODIES = {
    createPolicy: {
        description: 'Policy creation data',
        type: create_policy_dto_1.CreatePolicyDto,
    },
    updatePolicy: {
        description: 'Policy update data',
        type: update_policy_dto_1.UpdatePolicyDto,
    },
};
//# sourceMappingURL=policy-bodies.js.map