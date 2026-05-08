import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationAccessController } from './organization-access.controller';
import { OrganizationAccessService } from './organization-access.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationAccessController],
  providers: [OrganizationAccessService],
})
export class OrganizationAccessModule {}
