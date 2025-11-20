"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PEOPLE_BODIES = void 0;
const create_people_dto_1 = require("../dto/create-people.dto");
const update_people_dto_1 = require("../dto/update-people.dto");
const bulk_create_people_dto_1 = require("../dto/bulk-create-people.dto");
exports.PEOPLE_BODIES = {
    createMember: {
        description: 'Member creation data',
        type: create_people_dto_1.CreatePeopleDto,
    },
    bulkCreateMembers: {
        description: 'Bulk member creation data',
        type: bulk_create_people_dto_1.BulkCreatePeopleDto,
    },
    updateMember: {
        description: 'Member update data',
        type: update_people_dto_1.UpdatePeopleDto,
    },
};
//# sourceMappingURL=people-bodies.js.map