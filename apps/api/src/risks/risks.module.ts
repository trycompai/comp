import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RiskAcceptancesController } from './risk-acceptances.controller';
import { RiskAcceptancesService } from './risk-acceptances.service';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

@Module({
  imports: [AuthModule],
  controllers: [RisksController, RiskAcceptancesController],
  providers: [RisksService, RiskAcceptancesService],
  exports: [RisksService, RiskAcceptancesService],
})
export class RisksModule {}
