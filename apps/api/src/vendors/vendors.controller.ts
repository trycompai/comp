import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorsService } from './vendors.service';
import { VENDOR_OPERATIONS } from './schemas/vendor-operations';
import { VENDOR_PARAMS } from './schemas/vendor-params';
import { VENDOR_BODIES } from './schemas/vendor-bodies';
import { GET_ALL_VENDORS_RESPONSES } from './schemas/get-all-vendors.responses';
import { GET_VENDOR_BY_ID_RESPONSES } from './schemas/get-vendor-by-id.responses';
import { CREATE_VENDOR_RESPONSES } from './schemas/create-vendor.responses';
import { UPDATE_VENDOR_RESPONSES } from './schemas/update-vendor.responses';
import { DELETE_VENDOR_RESPONSES } from './schemas/delete-vendor.responses';

@ApiTags('Vendors')
@Controller({ path: 'vendors', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation(VENDOR_OPERATIONS.getAllVendors)
  @ApiResponse(GET_ALL_VENDORS_RESPONSES[200])
  @ApiResponse(GET_ALL_VENDORS_RESPONSES[401])
  @ApiResponse(GET_ALL_VENDORS_RESPONSES[404])
  @ApiResponse(GET_ALL_VENDORS_RESPONSES[500])
  async getAllVendors(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const vendors =
      await this.vendorsService.findAllByOrganization(organizationId);

    return {
      data: vendors,
      count: vendors.length,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get(':id')
  @ApiOperation(VENDOR_OPERATIONS.getVendorById)
  @ApiParam(VENDOR_PARAMS.vendorId)
  @ApiResponse(GET_VENDOR_BY_ID_RESPONSES[200])
  @ApiResponse(GET_VENDOR_BY_ID_RESPONSES[401])
  @ApiResponse(GET_VENDOR_BY_ID_RESPONSES[404])
  @ApiResponse(GET_VENDOR_BY_ID_RESPONSES[500])
  async getVendorById(
    @Param('id') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const vendor = await this.vendorsService.findById(vendorId, organizationId);

    return {
      ...vendor,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Post()
  @ApiOperation(VENDOR_OPERATIONS.createVendor)
  @ApiBody(VENDOR_BODIES.createVendor)
  @ApiResponse(CREATE_VENDOR_RESPONSES[201])
  @ApiResponse(CREATE_VENDOR_RESPONSES[400])
  @ApiResponse(CREATE_VENDOR_RESPONSES[401])
  @ApiResponse(CREATE_VENDOR_RESPONSES[404])
  @ApiResponse(CREATE_VENDOR_RESPONSES[500])
  async createVendor(
    @Body() createVendorDto: CreateVendorDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const vendor = await this.vendorsService.create(
      organizationId,
      createVendorDto,
    );

    return {
      ...vendor,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Patch(':id')
  @ApiOperation(VENDOR_OPERATIONS.updateVendor)
  @ApiParam(VENDOR_PARAMS.vendorId)
  @ApiBody(VENDOR_BODIES.updateVendor)
  @ApiResponse(UPDATE_VENDOR_RESPONSES[200])
  @ApiResponse(UPDATE_VENDOR_RESPONSES[400])
  @ApiResponse(UPDATE_VENDOR_RESPONSES[401])
  @ApiResponse(UPDATE_VENDOR_RESPONSES[404])
  @ApiResponse(UPDATE_VENDOR_RESPONSES[500])
  async updateVendor(
    @Param('id') vendorId: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedVendor = await this.vendorsService.updateById(
      vendorId,
      organizationId,
      updateVendorDto,
    );

    return {
      ...updatedVendor,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Delete(':id')
  @ApiOperation(VENDOR_OPERATIONS.deleteVendor)
  @ApiParam(VENDOR_PARAMS.vendorId)
  @ApiResponse(DELETE_VENDOR_RESPONSES[200])
  @ApiResponse(DELETE_VENDOR_RESPONSES[401])
  @ApiResponse(DELETE_VENDOR_RESPONSES[404])
  @ApiResponse(DELETE_VENDOR_RESPONSES[500])
  async deleteVendor(
    @Param('id') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.vendorsService.deleteById(
      vendorId,
      organizationId,
    );

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }
}
