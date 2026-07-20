import { Module } from '@nestjs/common';
import { IsmsController } from './isms.controller';
import { IsmsRegistersController } from './isms-registers.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsVersionService } from './isms-version.service';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { IsmsDocumentControlService } from './isms-document-control.service';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsRoleService } from './isms-role.service';
import { IsmsRoleAssignmentService } from './isms-role-assignment.service';
import { IsmsMetricService } from './isms-metric.service';
import { IsmsMeasurementService } from './isms-measurement.service';
import { IsmsNarrativeService } from './isms-narrative.service';
import { IsmsProfileController } from './wizard/isms-profile.controller';
import { IsmsProfileService } from './wizard/isms-profile.service';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  // AttachmentsModule: S3 access for retaining per-version rendered exports.
  imports: [AuthModule, AttachmentsModule],
  controllers: [
    IsmsController,
    IsmsRegistersController,
    IsmsProfileController,
  ],
  providers: [
    IsmsService,
    IsmsContextService,
    IsmsVersionService,
    IsmsContextIssueService,
    IsmsDocumentControlService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsRoleService,
    IsmsRoleAssignmentService,
    IsmsMetricService,
    IsmsMeasurementService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
  exports: [
    IsmsService,
    IsmsContextService,
    IsmsVersionService,
    IsmsContextIssueService,
    IsmsDocumentControlService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsRoleService,
    IsmsRoleAssignmentService,
    IsmsMetricService,
    IsmsMeasurementService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
})
export class IsmsModule {}
