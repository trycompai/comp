import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { RequirementController } from './requirement.controller';
import { RequirementService } from './requirement.service';

@Module({
  imports: [AuthModule],
  controllers: [RequirementController],
  providers: [RequirementService],
  exports: [RequirementService],
})
export class RequirementModule {}
