"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceAgentModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const device_agent_controller_1 = require("./device-agent.controller");
const device_agent_service_1 = require("./device-agent.service");
let DeviceAgentModule = class DeviceAgentModule {
};
exports.DeviceAgentModule = DeviceAgentModule;
exports.DeviceAgentModule = DeviceAgentModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [device_agent_controller_1.DeviceAgentController],
        providers: [device_agent_service_1.DeviceAgentService],
        exports: [device_agent_service_1.DeviceAgentService],
    })
], DeviceAgentModule);
//# sourceMappingURL=device-agent.module.js.map