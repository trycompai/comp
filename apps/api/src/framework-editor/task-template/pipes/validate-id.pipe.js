"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateIdPipe = void 0;
const common_1 = require("@nestjs/common");
let ValidateIdPipe = class ValidateIdPipe {
    transform(value) {
        if (!value || typeof value !== 'string' || value.trim() === '') {
            throw new common_1.BadRequestException('ID must be a non-empty string');
        }
        const cuidRegex = /^frk_tt_[a-z0-9]+$/i;
        if (!cuidRegex.test(value)) {
            throw new common_1.BadRequestException('Invalid ID format. Expected format: frk_tt_[alphanumeric]');
        }
        return value;
    }
};
exports.ValidateIdPipe = ValidateIdPipe;
exports.ValidateIdPipe = ValidateIdPipe = __decorate([
    (0, common_1.Injectable)()
], ValidateIdPipe);
//# sourceMappingURL=validate-id.pipe.js.map