import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TasksService } from '../tasks.service';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';

@Module({
  imports: [AuthModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, TasksService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
