import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationPlatformModule } from '../integration-platform/integration-platform.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { TimelinesModule } from '../timelines/timelines.module';
import { FleetService } from '../lib/fleet.service';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PeopleInviteService } from './people-invite.service';
import { PeopleAccessService } from './people-access.service';

@Module({
  imports: [AuthModule, AttachmentsModule, TimelinesModule, IntegrationPlatformModule],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleInviteService, PeopleAccessService, FleetService],
  exports: [PeopleService],
})
export class PeopleModule {}
