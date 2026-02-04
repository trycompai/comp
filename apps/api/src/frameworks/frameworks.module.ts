import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';

@Module({
  imports: [AuthModule],
  controllers: [FrameworksController],
  providers: [FrameworksService],
  exports: [FrameworksService],
})
export class FrameworksModule {}
