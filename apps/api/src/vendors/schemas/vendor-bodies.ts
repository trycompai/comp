import type { ApiBodyOptions } from '@nestjs/swagger';
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
};
