import { Module } from '@nestjs/common';
import { FindingsModule } from '../findings/findings.module';
import { TasksModule } from '../tasks/tasks.module';
import { VendorsModule } from '../vendors/vendors.module';
import { ContextModule } from '../context/context.module';
import { EvidenceFormsModule } from '../evidence-forms/evidence-forms.module';
import { PoliciesModule } from '../policies/policies.module';
import { CommentsModule } from '../comments/comments.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { BillingModule } from '../billing/billing.module';
import { SecurityPenetrationTestsModule } from '../security-penetration-tests/security-penetration-tests.module';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { AdminBillingActionsService } from './admin-billing-actions.service';
import { AdminBillingController } from './admin-billing.controller';
import { AdminBillingService } from './admin-billing.service';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminOrganizationsService } from './admin-organizations.service';
import { PurgeOrganizationService } from './purge-organization.service';
import { PurgeOrganizationSnapshotService } from './purge-organization-snapshot.service';
import { PurgeOrganizationExternalService } from './purge-organization-external.service';
import { AdminFindingsController } from './admin-findings.controller';
import { AdminPoliciesController } from './admin-policies.controller';
import { AdminTasksController } from './admin-tasks.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { AdminContextController } from './admin-context.controller';
import { AdminEvidenceController } from './admin-evidence.controller';
import { AdminPentestCreditsController } from './admin-pentest-credits.controller';
import { AdminFrameworksController } from './admin-frameworks.controller';

@Module({
  imports: [
    FindingsModule,
    TasksModule,
    VendorsModule,
    ContextModule,
    EvidenceFormsModule,
    PoliciesModule,
    CommentsModule,
    AttachmentsModule,
    BillingModule,
    SecurityPenetrationTestsModule,
    FrameworksModule,
  ],
  controllers: [
    AdminOrganizationsController,
    AdminFindingsController,
    AdminPoliciesController,
    AdminTasksController,
    AdminVendorsController,
    AdminContextController,
    AdminEvidenceController,
    AdminPentestCreditsController,
    AdminBillingController,
    AdminFrameworksController,
  ],
  providers: [
    AdminOrganizationsService,
    AdminBillingService,
    AdminBillingActionsService,
    PurgeOrganizationService,
    PurgeOrganizationSnapshotService,
    PurgeOrganizationExternalService,
  ],
})
export class AdminOrganizationsModule {}
