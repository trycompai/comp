import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TimelinesModule } from '../timelines/timelines.module';
import { FleetService } from '../lib/fleet.service';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PeopleInviteService } from './people-invite.service';

@Module({
  imports: [AuthModule, TimelinesModule],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleInviteService, FleetService],
  exports: [PeopleService],
})
export class PeopleModule {}
