import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreateRiskAcceptanceDto } from '../../risks/dto/create-risk-acceptance.dto';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';

export const VENDOR_BODIES: Record<string, ApiBodyOptions> = {
  createVendor: {
    description: 'Vendor creation data',
    type: CreateVendorDto,
  },
  updateVendor: {
    description: 'Vendor update data',
    type: UpdateVendorDto,
  },
  recordVendorAcceptance: {
    description: 'Acceptance data (acceptor defaults to the vendor owner)',
    type: CreateRiskAcceptanceDto,
  },
};
