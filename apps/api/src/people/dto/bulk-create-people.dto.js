"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkCreatePeopleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const create_people_dto_1 = require("./create-people.dto");
class BulkCreatePeopleDto {
    members;
}
exports.BulkCreatePeopleDto = BulkCreatePeopleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of members to create',
        type: [create_people_dto_1.CreatePeopleDto],
        example: [
            {
                userId: 'usr_abc123def456',
                role: 'admin',
                department: 'it',
                isActive: true,
                fleetDmLabelId: 123,
            },
            {
                userId: 'usr_def456ghi789',
                role: 'member',
                department: 'hr',
                isActive: true,
            },
        ],
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Members array cannot be empty' }),
    (0, class_validator_1.ArrayMaxSize)(1000, {
        message: 'Maximum 1000 members allowed per bulk request',
    }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_people_dto_1.CreatePeopleDto),
    __metadata("design:type", Array)
], BulkCreatePeopleDto.prototype, "members", void 0);
//# sourceMappingURL=bulk-create-people.dto.js.map