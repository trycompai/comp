import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FleetService } from '../lib/fleet.service';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  imports: [AuthModule],
  controllers: [PeopleController],
  providers: [PeopleService, FleetService],
  exports: [PeopleService],
})
export class PeopleModule {}
