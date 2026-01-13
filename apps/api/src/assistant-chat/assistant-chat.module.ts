import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssistantChatController } from './assistant-chat.controller';
import { AssistantChatService } from './assistant-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [AssistantChatController],
  providers: [AssistantChatService],
})
export class AssistantChatModule {}
