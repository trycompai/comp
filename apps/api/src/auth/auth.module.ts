import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MeController } from './me.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MeController],
  providers: [ApiKeyService, ApiKeyGuard, HybridAuthGuard, JwtAuthGuard],
  exports: [ApiKeyService, ApiKeyGuard, HybridAuthGuard, JwtAuthGuard],
})
export class AuthModule {}
