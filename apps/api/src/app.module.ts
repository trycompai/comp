import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttachmentsModule } from './attachments/attachments.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { PeopleModule } from './people/people.module';
import { DevicesModule } from './devices/devices.module';
import { DeviceAgentModule } from './device-agent/device-agent.module';
import { awsConfig } from './config/aws.config';
import { betterAuthConfig } from './config/better-auth.config';
import { HealthModule } from './health/health.module';
import { OrganizationModule } from './organization/organization.module';
import { OrganizationAccessModule } from './organization-access/organization-access.module';
import { PoliciesModule } from './policies/policies.module';
import { RisksModule } from './risks/risks.module';
import { TasksModule } from './tasks/tasks.module';
import { EvidenceExportModule } from './tasks/evidence-export/evidence-export.module';
import { VendorsModule } from './vendors/vendors.module';
import { ContextModule } from './context/context.module';
import { TrustPortalModule } from './trust-portal/trust-portal.module';
import { ControlTemplateModule } from './framework-editor/control-template/control-template.module';
import { IsmsDocumentTemplateModule } from './framework-editor/isms-document-template/isms-document-template.module';
import { FrameworkEditorFrameworkModule } from './framework-editor/framework/framework.module';
import { PolicyTemplateModule } from './framework-editor/policy-template/policy-template.module';
import { RequirementModule } from './framework-editor/requirement/requirement.module';
import { TaskTemplateModule } from './framework-editor/task-template/task-template.module';
import { FindingTemplateModule } from './finding-template/finding-template.module';
import { FindingsModule } from './findings/findings.module';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { SOAModule } from './soa/soa.module';
import { IsmsModule } from './isms/isms.module';
import { IntegrationPlatformModule } from './integration-platform/integration-platform.module';
import { CloudSecurityModule } from './cloud-security/cloud-security.module';
import { BrowserbaseModule } from './browserbase/browserbase.module';
import { TaskManagementModule } from './task-management/task-management.module';
import { AssistantChatModule } from './assistant-chat/assistant-chat.module';
import { OrgChartModule } from './org-chart/org-chart.module';
import { TrainingModule } from './training/training.module';
import { EvidenceFormsModule } from './evidence-forms/evidence-forms.module';
import { FrameworksModule } from './frameworks/frameworks.module';
import { FrameworkVersionsModule } from './framework-editor-versions/framework-versions.module';
import { AuditModule } from './audit/audit.module';
import { ControlsModule } from './controls/controls.module';
import { RolesModule } from './roles/roles.module';
import { McpModule } from './mcp/mcp.module';
import { McpDownloadModule } from './mcp-download/mcp-download.module';
import { EmailModule } from './email/email.module';
import { SecretsModule } from './secrets/secrets.module';
import { SecurityPenetrationTestsModule } from './security-penetration-tests/security-penetration-tests.module';
import { StripeModule } from './stripe/stripe.module';
import { AdminOrganizationsModule } from './admin-organizations/admin-organizations.module';
import { AdminFeatureFlagsModule } from './admin-feature-flags/admin-feature-flags.module';
import { TimelinesModule } from './timelines/timelines.module';
import { BackgroundChecksModule } from './background-checks/background-checks.module';
import { BillingModule } from './billing/billing.module';
import { OffboardingChecklistModule } from './offboarding-checklist/offboarding-checklist.module';

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
    OrganizationAccessModule,
    PeopleModule,
    RisksModule,
    VendorsModule,
    ContextModule,
    DevicesModule,
    PoliciesModule,
    DeviceAgentModule,
    AttachmentsModule,
    UploadsModule,
    TasksModule,
    EvidenceExportModule,
    CommentsModule,
    HealthModule,
    TrustPortalModule,
    ControlTemplateModule,
    IsmsDocumentTemplateModule,
    FrameworkEditorFrameworkModule,
    PolicyTemplateModule,
    RequirementModule,
    TaskTemplateModule,
    FindingTemplateModule,
    FindingsModule,
    QuestionnaireModule,
    VectorStoreModule,
    KnowledgeBaseModule,
    SOAModule,
    IsmsModule,
    IntegrationPlatformModule,
    CloudSecurityModule,
    BrowserbaseModule,
    TaskManagementModule,
    AssistantChatModule,
    TrainingModule,
    OrgChartModule,
    EvidenceFormsModule,
    FrameworksModule,
    FrameworkVersionsModule,
    RolesModule,
    AuditModule,
    ControlsModule,
    EmailModule,
    SecretsModule,
    SecurityPenetrationTestsModule,
    StripeModule,
    BillingModule,
    BackgroundChecksModule,
    AdminOrganizationsModule,
    AdminFeatureFlagsModule,
    TimelinesModule,
    OffboardingChecklistModule,
    McpModule,
    McpDownloadModule,
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
