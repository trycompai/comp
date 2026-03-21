import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PolicyTemplateController } from './policy-template.controller';
import { PolicyTemplateService } from './policy-template.service';

@Module({
  imports: [AuthModule],
  controllers: [PolicyTemplateController],
  providers: [PolicyTemplateService],
  exports: [PolicyTemplateService],
})
export class PolicyTemplateModule {}
