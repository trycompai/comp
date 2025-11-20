"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const attachments_module_1 = require("./attachments/attachments.module");
const auth_module_1 = require("./auth/auth.module");
const comments_module_1 = require("./comments/comments.module");
const people_module_1 = require("./people/people.module");
const devices_module_1 = require("./devices/devices.module");
const device_agent_module_1 = require("./device-agent/device-agent.module");
const aws_config_1 = require("./config/aws.config");
const better_auth_config_1 = require("./config/better-auth.config");
const health_module_1 = require("./health/health.module");
const organization_module_1 = require("./organization/organization.module");
const policies_module_1 = require("./policies/policies.module");
const risks_module_1 = require("./risks/risks.module");
const tasks_module_1 = require("./tasks/tasks.module");
const vendors_module_1 = require("./vendors/vendors.module");
const context_module_1 = require("./context/context.module");
const trust_portal_module_1 = require("./trust-portal/trust-portal.module");
const task_template_module_1 = require("./framework-editor/task-template/task-template.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [aws_config_1.awsConfig, better_auth_config_1.betterAuthConfig],
                validationOptions: {
                    allowUnknown: true,
                    abortEarly: true,
                },
            }),
            auth_module_1.AuthModule,
            organization_module_1.OrganizationModule,
            people_module_1.PeopleModule,
            risks_module_1.RisksModule,
            vendors_module_1.VendorsModule,
            context_module_1.ContextModule,
            devices_module_1.DevicesModule,
            policies_module_1.PoliciesModule,
            device_agent_module_1.DeviceAgentModule,
            devices_module_1.DevicesModule,
            attachments_module_1.AttachmentsModule,
            tasks_module_1.TasksModule,
            comments_module_1.CommentsModule,
            health_module_1.HealthModule,
            trust_portal_module_1.TrustPortalModule,
            task_template_module_1.TaskTemplateModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map