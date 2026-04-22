import { Module } from '@nestjs/common';
import { FrameworkVersionsController, FrameworkDraftDiffController } from './framework-versions.controller';
import { FrameworkVersionsService } from './framework-versions.service';

@Module({
  controllers: [FrameworkVersionsController, FrameworkDraftDiffController],
  providers: [FrameworkVersionsService],
  exports: [FrameworkVersionsService],
})
export class FrameworkVersionsModule {}
