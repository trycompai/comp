import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TimelinesModule } from '../timelines/timelines.module';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';

@Module({
  imports: [AuthModule, TimelinesModule],
  controllers: [FrameworksController],
  providers: [FrameworksService],
  exports: [FrameworksService],
})
export class FrameworksModule {}
