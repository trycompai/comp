import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgChartController],
  providers: [OrgChartService],
  exports: [OrgChartService],
})
export class OrgChartModule {}
