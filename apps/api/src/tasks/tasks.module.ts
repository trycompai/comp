import { Module, forwardRef } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { AutomationsModule } from './automations/automations.module';
import { NovuService } from '../notifications/novu.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskNotifierService } from './task-notifier.service';

@Module({
  imports: [AuthModule, AttachmentsModule, forwardRef(() => AutomationsModule)],
  controllers: [TasksController],
  providers: [TasksService, TaskNotifierService, NovuService],
  exports: [TasksService, TaskNotifierService],
})
export class TasksModule {}
