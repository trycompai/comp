import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { FrameworkFamilyController } from './framework-family.controller';
import { FrameworkFamilyService } from './framework-family.service';

@Module({
  imports: [AuthModule],
  controllers: [FrameworkFamilyController],
  providers: [FrameworkFamilyService],
  exports: [FrameworkFamilyService],
})
export class FrameworkFamilyModule {}
