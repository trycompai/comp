import { Module } from '@nestjs/common';
import { IsmsController } from './isms.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IsmsController],
  providers: [IsmsService, IsmsContextService, IsmsContextIssueService],
  exports: [IsmsService, IsmsContextService, IsmsContextIssueService],
})
export class IsmsModule {}
