"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RisksModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const risks_controller_1 = require("./risks.controller");
const risks_service_1 = require("./risks.service");
let RisksModule = class RisksModule {
};
exports.RisksModule = RisksModule;
exports.RisksModule = RisksModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [risks_controller_1.RisksController],
        providers: [risks_service_1.RisksService],
        exports: [risks_service_1.RisksService],
    })
], RisksModule);
//# sourceMappingURL=risks.module.js.map