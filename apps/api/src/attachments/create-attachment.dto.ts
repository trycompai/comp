import { AttachmentEntityType } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UploadAttachmentDto } from './upload-attachment.dto';

export class CreateAttachmentDto extends UploadAttachmentDto {
  @ApiProperty({
    description: 'ID of the entity to attach the file to',
    example: 'tsk_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Type of entity the attachment belongs to',
    enum: AttachmentEntityType,
    enumName: 'AttachmentEntityType',
    example: AttachmentEntityType.task,
  })
  @IsEnum(AttachmentEntityType)
  entityType: AttachmentEntityType;
}
