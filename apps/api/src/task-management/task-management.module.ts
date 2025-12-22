import { Module } from '@nestjs/common';
import { TaskManagementController } from './task-management.controller';
import { TaskManagementService } from './task-management.service';
import { AuthModule } from '@/auth/auth.module';
import { TaskItemAssignmentNotifierService } from './task-item-assignment-notifier.service';
import { TaskItemMentionNotifierService } from './task-item-mention-notifier.service';
import { TaskItemAuditService } from './task-item-audit.service';
import { NovuService } from '../notifications/novu.service';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [TaskManagementController],
  providers: [
    TaskManagementService,
    TaskItemAssignmentNotifierService,
    TaskItemMentionNotifierService,
    TaskItemAuditService,
    NovuService,
  ],
  exports: [TaskManagementService],
})
export class TaskManagementModule {}
