import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentMentionNotifierService } from './comment-mention-notifier.service';
import { NovuService } from '../notifications/novu.service';

@Module({
  imports: [AuthModule, AttachmentsModule], // Import AuthModule for HybridAuthGuard dependencies
  controllers: [CommentsController],
  providers: [CommentsService, CommentMentionNotifierService, NovuService],
  exports: [CommentsService],
})
export class CommentsModule {}
