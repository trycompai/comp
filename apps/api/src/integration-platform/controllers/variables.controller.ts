import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { getManifest, type CheckVariable } from '@comp/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';

interface SaveVariablesDto {
  variables: Record<string, string | number | boolean | string[]>;
}

interface VariableOption {
  value: string;
  label: string;
}

interface VariableDefinition {
  id: string;
  label: string;
  type: string;
  required: boolean;
  default?: string | number | boolean | string[];
  helpText?: string;
  placeholder?: string;
  options?: VariableOption[];
  hasDynamicOptions: boolean;
}

@Controller({ path: 'integrations/variables', version: '1' })
export class VariablesController {
  private readonly logger = new Logger(VariablesController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly autoCheckRunnerService: AutoCheckRunnerService,
  ) {}

  /**
   * Get all variables required for a provider's checks
   */
  @Get('providers/:providerSlug')
  async getProviderVariables(
    @Param('providerSlug') providerSlug: string,
  ): Promise<{ variables: VariableDefinition[] }> {
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Collect all unique variables from manifest-level and checks
    const variableMap = new Map<string, CheckVariable>();

    // First, add manifest-level variables
    for (const variable of manifest.variables || []) {
      variableMap.set(variable.id, variable);
    }

    // Then, add check-specific variables (won't override manifest-level)
    for (const check of manifest.checks || []) {
      for (const variable of check.variables || []) {
        if (!variableMap.has(variable.id)) {
          variableMap.set(variable.id, variable);
        }
      }
    }

    const variables: VariableDefinition[] = Array.from(
      variableMap.values(),
    ).map((v) => ({
      id: v.id,
      label: v.label,
      type: v.type,
      required: v.required || false,
      default: v.default,
      helpText: v.helpText,
      placeholder: v.placeholder,
      options: v.options,
      hasDynamicOptions: !!v.fetchOptions,
    }));

    return { variables };
  }

  /**
   * Get variables for a specific connection (with current values)
   */
  @Get('connections/:connectionId')
  async getConnectionVariables(@Param('connectionId') connectionId: string) {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException(
        `Manifest for ${provider.slug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Collect all unique variables from manifest-level and checks
    const variableMap = new Map<string, CheckVariable>();

    // First, add manifest-level variables
    for (const variable of manifest.variables || []) {
      variableMap.set(variable.id, variable);
    }

    // Then, add check-specific variables
    for (const check of manifest.checks || []) {
      for (const variable of check.variables || []) {
        if (!variableMap.has(variable.id)) {
          variableMap.set(variable.id, variable);
        }
      }
    }

    // Get current values from connection
    const currentValues =
      (connection.variables as Record<string, unknown>) || {};

    const variables = Array.from(variableMap.values()).map((v) => ({
      id: v.id,
      label: v.label,
      type: v.type,
      required: v.required || false,
      default: v.default,
      helpText: v.helpText,
      placeholder: v.placeholder,
      options: v.options,
      hasDynamicOptions: !!v.fetchOptions,
      currentValue: currentValues[v.id],
    }));

    return {
      connectionId,
      providerSlug: provider.slug,
      variables,
    };
  }

  /**
   * Fetch dynamic options for a variable (requires active connection)
   */
  @Get('connections/:connectionId/options/:variableId')
  async fetchVariableOptions(
    @Param('connectionId') connectionId: string,
    @Param('variableId') variableId: string,
  ): Promise<{ options: VariableOption[] }> {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.status !== 'active') {
      throw new HttpException(
        'Connection must be active to fetch options',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException(
        `Manifest for ${provider.slug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Find the variable definition (check manifest-level first, then checks)
    let variable: CheckVariable | undefined;

    // Check manifest-level variables
    variable = manifest.variables?.find((v) => v.id === variableId);

    // If not found, check in check-specific variables
    if (!variable) {
      for (const check of manifest.checks || []) {
        variable = check.variables?.find((v) => v.id === variableId);
        if (variable) break;
      }
    }

    if (!variable) {
      throw new HttpException(
        `Variable ${variableId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!variable.fetchOptions) {
      // Return static options if available
      return { options: variable.options || [] };
    }

    // Get credentials to make authenticated requests
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const baseUrl = manifest.baseUrl || '';
    const defaultHeaders = manifest.defaultHeaders || {};

    const buildHeaders = () => ({
      ...defaultHeaders,
      Authorization: `Bearer ${credentials.access_token}`,
    });

    // Create minimal context for fetching options
    const fetchContext = {
      accessToken: credentials.access_token,

      fetch: async <T = unknown>(path: string): Promise<T> => {
        const url = new URL(path, baseUrl);
        const response = await fetch(url.toString(), {
          headers: buildHeaders(),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },

      fetchAllPages: async <T = unknown>(path: string): Promise<T[]> => {
        const allItems: T[] = [];
        let page = 1;
        const perPage = 100;

        while (page <= 10) {
          const url = new URL(path, baseUrl);
          url.searchParams.set('page', String(page));
          url.searchParams.set('per_page', String(perPage));

          const response = await fetch(url.toString(), {
            headers: buildHeaders(),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const items: T[] = await response.json();
          if (!Array.isArray(items) || items.length === 0) break;

          allItems.push(...items);
          if (items.length < perPage) break;
          page++;
        }

        return allItems;
      },

      graphql: async <T = unknown>(
        query: string,
        variables?: Record<string, unknown>,
      ): Promise<T> => {
        const endpoint = `${baseUrl}/graphql`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = (await response.json()) as {
          data?: T;
          errors?: Array<{ message: string }>;
        };

        if (result.errors?.length) {
          throw new Error(
            `GraphQL: ${result.errors.map((e) => e.message).join(', ')}`,
          );
        }
        if (!result.data) throw new Error('GraphQL response missing data');

        return result.data;
      },
    };

    try {
      this.logger.log(`Fetching options for variable ${variableId}`);
      const options = await variable.fetchOptions(fetchContext);
      return { options };
    } catch (error) {
      this.logger.error(`Failed to fetch options: ${error}`);
      throw new HttpException(
        `Failed to fetch options: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Save variable values for a connection
   */
  @Post('connections/:connectionId')
  async saveConnectionVariables(
    @Param('connectionId') connectionId: string,
    @Body() body: SaveVariablesDto,
  ) {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    // Merge with existing variables
    const existingVariables =
      (connection.variables as Record<string, unknown>) || {};
    const newVariables = {
      ...existingVariables,
      ...body.variables,
    };

    await this.connectionRepository.update(connectionId, {
      variables: newVariables,
    });

    this.logger.log(`Saved variables for connection ${connectionId}`);

    // Auto-run checks if possible (fire and forget)
    this.autoCheckRunnerService
      .tryAutoRunChecks(connectionId)
      .then((didRun) => {
        if (didRun) {
          this.logger.log(
            `Auto-ran checks for connection ${connectionId} after variables saved`,
          );
        }
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to auto-run checks after saving variables: ${err.message}`,
        );
      });

    return { success: true, variables: newVariables };
  }
}
