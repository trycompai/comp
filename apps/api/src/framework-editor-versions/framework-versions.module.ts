import { Module } from '@nestjs/common';
import { FrameworkVersionsController } from './framework-versions.controller';
import { FrameworkVersionsService } from './framework-versions.service';

@Module({
  controllers: [FrameworkVersionsController],
  providers: [FrameworkVersionsService],
  exports: [FrameworkVersionsService],
})
export class FrameworkVersionsModule {}
