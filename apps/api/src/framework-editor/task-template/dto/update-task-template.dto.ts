import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TaskAutomationStatus } from '@trycompai/db';
import { CreateTaskTemplateDto } from './create-task-template.dto';

export class UpdateTaskTemplateDto extends PartialType(CreateTaskTemplateDto) {
  @ApiPropertyOptional({
    description: 'Automation status of the task',
    enum: TaskAutomationStatus,
    example: TaskAutomationStatus.AUTOMATED,
  })
  @IsOptional()
  @IsEnum(TaskAutomationStatus)
  automationStatus?: TaskAutomationStatus;
}
