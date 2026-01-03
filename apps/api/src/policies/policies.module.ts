import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { PolicyAcknowledgementsController } from './policy-acknowledgements.controller';
import { PolicyAcknowledgementsService } from './policy-acknowledgements.service';

@Module({
  imports: [AuthModule],
  controllers: [PoliciesController, PolicyAcknowledgementsController],
  providers: [PoliciesService, PolicyAcknowledgementsService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
