import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FrameworkInstanceRequirementsController } from './framework-instance-requirements.controller';
import { FrameworkInstanceRequirementsService } from './framework-instance-requirements.service';

@Module({
  imports: [AuthModule],
  controllers: [FrameworkInstanceRequirementsController],
  providers: [FrameworkInstanceRequirementsService],
  exports: [FrameworkInstanceRequirementsService],
})
export class FrameworkInstanceRequirementsModule {}
