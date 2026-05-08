import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailController } from './email.controller';
import { UnsubscribeController } from './unsubscribe.controller';

@Module({
  imports: [AuthModule],
  controllers: [EmailController, UnsubscribeController],
})
export class EmailModule {}
