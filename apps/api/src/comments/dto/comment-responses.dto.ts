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

export class AttachmentMetadataDto {
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
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class AuthorResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'usr_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@company.com',
  })
  email: string;

  @ApiProperty({
    description: 'User profile image URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  image: string | null;

  @ApiProperty({
    description: 'Whether the user is deactivated',
    example: false,
    nullable: true,
  })
  deactivated: boolean;
}

export class CommentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the comment',
    example: 'cmt_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Comment content',
    example: 'This task needs to be completed by end of week',
  })
  content: string;

  @ApiProperty({
    description: 'Comment author information',
    type: AuthorResponseDto,
  })
  author: AuthorResponseDto;

  @ApiProperty({
    description: 'Attachment metadata (URLs generated on-demand)',
    type: [AttachmentMetadataDto],
  })
  attachments: AttachmentMetadataDto[];

  @ApiProperty({
    description: 'Comment creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
