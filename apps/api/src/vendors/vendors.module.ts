import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RisksModule } from '../risks/risks.module';
import { InternalVendorAutomationController } from './internal-vendor-automation.controller';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [AuthModule, RisksModule],
  controllers: [VendorsController, InternalVendorAutomationController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
