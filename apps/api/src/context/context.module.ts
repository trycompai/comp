import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';

@Module({
  imports: [AuthModule],
  controllers: [ContextController],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
