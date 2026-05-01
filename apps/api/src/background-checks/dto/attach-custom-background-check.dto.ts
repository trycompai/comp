import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UploadAttachmentDto } from '../../attachments/upload-attachment.dto';

export class AttachCustomBackgroundCheckDto extends UploadAttachmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  employeeName?: string;

  @IsOptional()
  @IsEmail()
  employeeEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requesterNotes?: string;
}
