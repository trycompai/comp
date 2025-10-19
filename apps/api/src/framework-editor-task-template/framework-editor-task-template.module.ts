import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FrameworkEditorTaskTemplateController } from './framework-editor-task-template.controller';
import { FrameworkEditorTaskTemplateService } from './framework-editor-task-template.service';

@Module({
  imports: [AuthModule],
  controllers: [FrameworkEditorTaskTemplateController],
  providers: [FrameworkEditorTaskTemplateService],
  exports: [FrameworkEditorTaskTemplateService],
})
export class FrameworkEditorTaskTemplateModule {}

