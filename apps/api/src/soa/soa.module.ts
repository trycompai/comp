import { Module } from '@nestjs/common';
import { SOAController } from './soa.controller';
import { SOAService } from './soa.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SOAController],
  providers: [SOAService],
  exports: [SOAService],
})
export class SOAModule {}
