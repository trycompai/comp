import { Module } from '@nestjs/common';
import { BrowserbaseController } from './browserbase.controller';
import { BrowserbaseService } from './browserbase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BrowserbaseController],
  providers: [BrowserbaseService],
  exports: [BrowserbaseService],
})
export class BrowserbaseModule {}
