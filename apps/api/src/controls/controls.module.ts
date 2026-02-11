import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ControlsController } from './controls.controller';
import { ControlsService } from './controls.service';

@Module({
  imports: [AuthModule],
  controllers: [ControlsController],
  providers: [ControlsService],
  exports: [ControlsService],
})
export class ControlsModule {}
