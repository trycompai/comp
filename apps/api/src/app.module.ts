import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { PeopleModule } from './people/people.module';
import { DevicesModule } from './devices/devices.module';
import { DeviceAgentModule } from './device-agent/device-agent.module';
import { awsConfig } from './config/aws.config';
import { betterAuthConfig } from './config/better-auth.config';
import { HealthModule } from './health/health.module';
import { OrganizationModule } from './organization/organization.module';
import { PoliciesModule } from './policies/policies.module';
import { RisksModule } from './risks/risks.module';
import { TasksModule } from './tasks/tasks.module';
import { VendorsModule } from './vendors/vendors.module';
import { ContextModule } from './context/context.module';
import { TrustPortalModule } from './trust-portal/trust-portal.module';
import { TaskTemplateModule } from './framework-editor/task-template/task-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env file is loaded manually in main.ts before NestJS starts
      load: [awsConfig, betterAuthConfig],
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    AuthModule,
    OrganizationModule,
    PeopleModule,
    RisksModule,
    VendorsModule,
    ContextModule,
    DevicesModule,
    PoliciesModule,
    DeviceAgentModule,
    DevicesModule,
    AttachmentsModule,
    TasksModule,
    CommentsModule,
    HealthModule,
    TrustPortalModule,
    TaskTemplateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
