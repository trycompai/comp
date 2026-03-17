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
  providers: [AdminOrganizationsService],
})
export class AdminOrganizationsModule {}
