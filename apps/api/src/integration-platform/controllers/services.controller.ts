import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { ConnectionService } from '../services/connection.service';
import { getManifest } from '@trycompai/integration-platform';

@Controller({ path: 'integrations/connections', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class ServicesController {
  constructor(
    private readonly connectionService: ConnectionService,
  ) {}

  /**
   * Get services for a connection with their enabled state
   */
  @Get(':id/services')
  @RequirePermission('integration', 'read')
  async getConnectionServices(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const connection = await this.connectionService.getConnectionForOrg(
      id,
      organizationId,
    );

    const providerSlug = (connection as { provider?: { slug: string } })
      .provider?.slug;
    if (!providerSlug) {
      throw new HttpException('Connection has no provider', HttpStatus.BAD_REQUEST);
    }

    const manifest = getManifest(providerSlug);
    if (!manifest?.services?.length) {
      return { services: [] };
    }

    const raw = connection.variables;
    const variables: Record<string, unknown> =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const disabledServices = new Set<string>(
      Array.isArray(variables.disabledServices) ? variables.disabledServices as string[] : [],
    );
    const rawDetected = Array.isArray(variables.detectedServices) ? variables.detectedServices as string[] : [];
    const detectedServices = rawDetected.length > 0 ? rawDetected : null;
    // Legacy format support
    const legacyEnabledServices = Array.isArray(variables.enabledServices)
      ? (variables.enabledServices as string[])
      : null;

    // AWS security baseline: always scanned, hidden from Services tab
    const BASELINE_SERVICES = providerSlug === 'aws'
      ? new Set(['cloudtrail', 'config', 'guardduty', 'iam', 'cloudwatch', 'kms'])
      : new Set<string>();

    return {
      services: manifest.services
        .filter((s) => !BASELINE_SERVICES.has(s.id))
        .map((s) => {
          // Unimplemented services are never enabled
          if (s.implemented === false) {
            return {
              id: s.id,
              name: s.name,
              description: s.description,
              implemented: false,
              enabled: false,
            };
          }

          let enabled: boolean;
          if (legacyEnabledServices) {
            enabled = legacyEnabledServices.includes(s.id) && !disabledServices.has(s.id);
          } else if (detectedServices) {
            enabled = detectedServices.includes(s.id) && !disabledServices.has(s.id);
          } else {
            // Default: use enabledByDefault from manifest, otherwise enabled
            enabled = (s.enabledByDefault ?? true) && !disabledServices.has(s.id);
          }

          return {
            id: s.id,
            name: s.name,
            description: s.description,
            implemented: true,
            enabled,
          };
        }),
    };
  }
}
