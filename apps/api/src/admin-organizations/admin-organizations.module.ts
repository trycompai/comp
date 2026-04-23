import { Module } from '@nestjs/common';
import { FindingsModule } from '../findings/findings.module';
import { TasksModule } from '../tasks/tasks.module';
import { VendorsModule } from '../vendors/vendors.module';
import { ContextModule } from '../context/context.module';
import { EvidenceFormsModule } from '../evidence-forms/evidence-forms.module';
import { PoliciesModule } from '../policies/policies.module';
import { CommentsModule } from '../comments/comments.module';
import { AttachmentsModule } from '../attachments/attachments.module';
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
  ],
  controllers: [
    AdminOrganizationsController,
    AdminFindingsController,
    AdminPoliciesController,
    AdminTasksController,
    AdminVendorsController,
    AdminContextController,
    AdminEvidenceController,
  ],
  providers: [
    AdminOrganizationsService,
    PurgeOrganizationService,
    PurgeOrganizationSnapshotService,
    PurgeOrganizationExternalService,
  ],
})
export class AdminOrganizationsModule {}
