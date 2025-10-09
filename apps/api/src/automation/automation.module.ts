import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [AuthModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
