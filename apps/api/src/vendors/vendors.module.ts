import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InternalVendorAutomationController } from './internal-vendor-automation.controller';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorIntegrationsController } from './vendor-integrations.controller';
import { VendorIntegrationsService } from './vendor-integrations.service';

@Module({
  imports: [AuthModule],
  controllers: [
    VendorsController,
    VendorIntegrationsController,
    InternalVendorAutomationController,
  ],
  providers: [VendorsService, VendorIntegrationsService],
  exports: [VendorsService, VendorIntegrationsService],
})
export class VendorsModule {}
