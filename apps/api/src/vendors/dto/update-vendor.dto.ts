import { PartialType } from '@nestjs/swagger';
import { CreateVendorDto } from './create-vendor.dto';

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
