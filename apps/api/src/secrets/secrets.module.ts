import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

@Module({
  imports: [AuthModule],
  controllers: [SecretsController],
  providers: [SecretsService],
})
export class SecretsModule {}
