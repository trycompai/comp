import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssistantChatMessageDto {
  @ApiProperty({ example: 'msg_abc123' })
  @IsString()
  id!: string;

  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'How do I invite a teammate?' })
  @IsString()
  text!: string;

  @ApiProperty({ example: 1735781554000, description: 'Unix epoch millis' })
  @IsNumber()
  createdAt!: number;
}

export class SaveAssistantChatHistoryDto {
  @ApiProperty({ type: [AssistantChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantChatMessageDto)
  messages!: AssistantChatMessageDto[];
}


