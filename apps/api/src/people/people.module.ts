import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FleetService } from '../lib/fleet.service';
import { PeopleController } from './people.controller';
import { PeopleMeController } from './people-me.controller';
import { PeopleMeService } from './people-me.service';
import { PeopleService } from './people.service';

@Module({
  imports: [AuthModule],
  // IMPORTANT: Register `/people/me` routes before `/people/:id` routes so `me`
  // doesn't get captured as a dynamic `:id` param.
  controllers: [PeopleMeController, PeopleController],
  providers: [PeopleService, PeopleMeService, FleetService],
  exports: [PeopleService],
})
export class PeopleModule {}
