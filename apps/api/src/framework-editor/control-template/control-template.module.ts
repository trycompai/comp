import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ControlTemplateController } from './control-template.controller';
import { ControlTemplateService } from './control-template.service';

@Module({
  imports: [AuthModule],
  controllers: [ControlTemplateController],
  providers: [ControlTemplateService],
  exports: [ControlTemplateService],
})
export class ControlTemplateModule {}
