import { MemberResponseDto } from '@/devices/dto/member-responses.dto';
import { ApiProperty } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the attachment',
    example: 'att_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'document.pdf',
  })
  name: string;

  @ApiProperty({
    description: 'File type/MIME type',
    example: 'application/pdf',
  })
  type: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  size?: number;

  @ApiProperty({
    description: 'Signed URL for downloading the file (temporary)',
    example: 'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class TaskResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the task',
    example: 'tsk_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
  })
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Add OAuth 2.0 authentication to the platform',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Task status',
    example: 'in_progress',
    enum: ['todo', 'in_progress', 'done', 'blocked'],
  })
  status: string;

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Task last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Task template ID',
    example: 'frk_tt_68406e353df3bc002994acef',
    nullable: true,
    required: false,
  })
  taskTemplateId?: string | null;
}
