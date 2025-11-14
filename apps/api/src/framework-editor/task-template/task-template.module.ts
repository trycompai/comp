import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TaskTemplateController } from './task-template.controller';
import { TaskTemplateService } from './task-template.service';

@Module({
  imports: [AuthModule],
  controllers: [TaskTemplateController],
  providers: [TaskTemplateService],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
