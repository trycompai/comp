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
exports.DevicesByMemberResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const device_responses_dto_1 = require("./device-responses.dto");
const member_responses_dto_1 = require("./member-responses.dto");
class DevicesByMemberResponseDto {
    data;
    count;
    member;
    authType;
    authenticatedUser;
}
exports.DevicesByMemberResponseDto = DevicesByMemberResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of devices assigned to the member',
        type: [device_responses_dto_1.DeviceResponseDto],
    }),
    __metadata("design:type", Array)
], DevicesByMemberResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of devices for this member',
        example: 3,
    }),
    __metadata("design:type", Number)
], DevicesByMemberResponseDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member information',
        type: member_responses_dto_1.MemberResponseDto,
    }),
    __metadata("design:type", member_responses_dto_1.MemberResponseDto)
], DevicesByMemberResponseDto.prototype, "member", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'How the request was authenticated',
        enum: ['api-key', 'session'],
        example: 'api-key',
    }),
    __metadata("design:type", String)
], DevicesByMemberResponseDto.prototype, "authType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Authenticated user information (present for session auth)',
        required: false,
        example: {
            id: 'usr_abc123def456',
            email: 'user@company.com',
        },
    }),
    __metadata("design:type", Object)
], DevicesByMemberResponseDto.prototype, "authenticatedUser", void 0);
//# sourceMappingURL=devices-by-member-response.dto.js.map