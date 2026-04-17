import { Module } from '@nestjs/common';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { PostHogService } from './posthog.service';

@Module({
  controllers: [AdminFeatureFlagsController],
  providers: [AdminFeatureFlagsService, PostHogService],
  exports: [AdminFeatureFlagsService, PostHogService],
})
export class AdminFeatureFlagsModule {}
