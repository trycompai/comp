import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { AssistantChatController } from './assistant-chat.controller';
import { AssistantChatService } from './assistant-chat.service';

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [AssistantChatController],
  providers: [AssistantChatService],
})
export class AssistantChatModule {}
