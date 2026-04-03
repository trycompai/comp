import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailController } from './email.controller';

@Module({
  imports: [AuthModule],
  controllers: [EmailController],
})
export class EmailModule {}
