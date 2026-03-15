import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminOrgController } from './admin-org.controller';
import { AdminService } from './admin.service';
import { AdminOrgService } from './admin-org.service';
import { AdminOrgDataService } from './admin-org-data.service';

@Module({
  controllers: [AdminController, AdminOrgController],
  providers: [AdminService, AdminOrgService, AdminOrgDataService],
})
export class AdminModule {}
