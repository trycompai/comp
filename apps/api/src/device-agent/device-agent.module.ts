import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeviceAgentAuthService } from './device-agent-auth.service';
import { DeviceAgentController } from './device-agent.controller';
import { DeviceAgentService } from './device-agent.service';

@Module({
  imports: [AuthModule],
  controllers: [DeviceAgentController],
  providers: [DeviceAgentService, DeviceAgentAuthService],
  exports: [DeviceAgentService],
})
export class DeviceAgentModule {}
