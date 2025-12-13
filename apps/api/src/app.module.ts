import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { SOAModule } from './soa/soa.module';
import { IntegrationPlatformModule } from './integration-platform/integration-platform.module';
import { CloudSecurityModule } from './cloud-security/cloud-security.module';
import { BrowserbaseModule } from './browserbase/browserbase.module';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute per IP
      },
    ]),
    AuthModule,
    OrganizationModule,
    PeopleModule,
    RisksModule,
    VendorsModule,
    ContextModule,
    DevicesModule,
    PoliciesModule,
    DeviceAgentModule,
    AttachmentsModule,
    TasksModule,
    CommentsModule,
    HealthModule,
    TrustPortalModule,
    TaskTemplateModule,
    QuestionnaireModule,
    VectorStoreModule,
    KnowledgeBaseModule,
    SOAModule,
    IntegrationPlatformModule,
    CloudSecurityModule,
    BrowserbaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
