import { Module } from '@nestjs/common';
import { TaskManagementController } from './task-management.controller';
import { TaskManagementService } from './task-management.service';
import { AuthModule } from '@/auth/auth.module';
import { TaskItemAssignmentNotifierService } from './task-item-assignment-notifier.service';
import { NovuService } from '../notifications/novu.service';

@Module({
  imports: [AuthModule],
  controllers: [TaskManagementController],
  providers: [
    TaskManagementService,
    TaskItemAssignmentNotifierService,
    NovuService,
  ],
  exports: [TaskManagementService],
})
export class TaskManagementModule {}
