import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { IsmsDocumentTemplateController } from './isms-document-template.controller';
import { IsmsDocumentTemplateService } from './isms-document-template.service';

@Module({
  imports: [AuthModule],
  controllers: [IsmsDocumentTemplateController],
  providers: [IsmsDocumentTemplateService],
  exports: [IsmsDocumentTemplateService],
})
export class IsmsDocumentTemplateModule {}
