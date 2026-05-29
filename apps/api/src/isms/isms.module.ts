import { Module } from '@nestjs/common';
import { IsmsController } from './isms.controller';
import { IsmsRegistersController } from './isms-registers.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsNarrativeService } from './isms-narrative.service';
import { IsmsProfileController } from './wizard/isms-profile.controller';
import { IsmsProfileService } from './wizard/isms-profile.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    IsmsController,
    IsmsRegistersController,
    IsmsProfileController,
  ],
  providers: [
    IsmsService,
    IsmsContextService,
    IsmsContextIssueService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
  exports: [
    IsmsService,
    IsmsContextService,
    IsmsContextIssueService,
    IsmsInterestedPartyService,
    IsmsRequirementService,
    IsmsObjectiveService,
    IsmsNarrativeService,
    IsmsProfileService,
  ],
})
export class IsmsModule {}
