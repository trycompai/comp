import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FindingTemplateController } from './finding-template.controller';
import { FindingTemplateService } from './finding-template.service';

@Module({
  imports: [AuthModule],
  controllers: [FindingTemplateController],
  providers: [FindingTemplateService],
  exports: [FindingTemplateService],
})
export class FindingTemplateModule {}
