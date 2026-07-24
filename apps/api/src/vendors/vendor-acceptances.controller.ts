import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreateRiskAcceptanceDto } from '../risks/dto/create-risk-acceptance.dto';
import { RiskAcceptancesService } from '../risks/risk-acceptances.service';
import { VENDOR_OPERATIONS } from './schemas/vendor-operations';
import { VENDOR_PARAMS } from './schemas/vendor-params';
import { VENDOR_BODIES } from './schemas/vendor-bodies';
import {
  LIST_VENDOR_ACCEPTANCES_RESPONSES,
  RECORD_VENDOR_ACCEPTANCE_RESPONSES,
} from './schemas/vendor-acceptances.responses';

/**
 * Residual-risk acceptance events for vendor risks (ISO 27001 6.1.3(f),
 * CS-727). Append-only: list + record, no update/delete. Vendors have no
 * assignment-based access filtering (unlike risks), so vendor:read /
 * vendor:update are the whole gate — same as the rest of VendorsController.
 */
@ApiTags('Vendors')
@Controller({ path: 'vendors', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class VendorAcceptancesController {
  constructor(
    private readonly riskAcceptancesService: RiskAcceptancesService,
  ) {}

  @Get(':id/acceptances')
  @RequirePermission('vendor', 'read')
  @ApiOperation(VENDOR_OPERATIONS.listVendorAcceptances)
  @ApiParam(VENDOR_PARAMS.vendorId)
  @ApiResponse(LIST_VENDOR_ACCEPTANCES_RESPONSES[200])
  @ApiResponse(LIST_VENDOR_ACCEPTANCES_RESPONSES[401])
  @ApiResponse(LIST_VENDOR_ACCEPTANCES_RESPONSES[403])
  @ApiResponse(LIST_VENDOR_ACCEPTANCES_RESPONSES[404])
  @ApiResponse(LIST_VENDOR_ACCEPTANCES_RESPONSES[500])
  async listVendorAcceptances(
    @Param('id') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const { acceptances } = await this.riskAcceptancesService.listForVendor(
      vendorId,
      organizationId,
    );

    return {
      data: acceptances,
      authType: authContext.authType,
      ...this.authenticatedUser(authContext),
    };
  }

  @Post(':id/acceptances')
  @RequirePermission('vendor', 'update')
  @ApiOperation(VENDOR_OPERATIONS.recordVendorAcceptance)
  @ApiParam(VENDOR_PARAMS.vendorId)
  @ApiBody(VENDOR_BODIES.recordVendorAcceptance)
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[201])
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[400])
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[401])
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[403])
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[404])
  @ApiResponse(RECORD_VENDOR_ACCEPTANCE_RESPONSES[500])
  async recordVendorAcceptance(
    @Param('id') vendorId: string,
    @Body() dto: CreateRiskAcceptanceDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const acceptance = await this.riskAcceptancesService.createForVendor(
      vendorId,
      organizationId,
      dto,
    );

    return {
      ...acceptance,
      authType: authContext.authType,
      ...this.authenticatedUser(authContext),
    };
  }

  private authenticatedUser(authContext: AuthContextType) {
    return authContext.userId && authContext.userEmail
      ? {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }
      : {};
  }
}
