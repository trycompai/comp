import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  DomainStatusResponseDto,
  DomainVerificationDto,
  GetDomainStatusDto,
} from './dto/domain-status.dto';

interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

@Injectable()
export class TrustPortalService {
  private readonly logger = new Logger(TrustPortalService.name);
  private readonly vercelApi: AxiosInstance;

  constructor() {
    const bearerToken = process.env.VERCEL_ACCESS_TOKEN;

    if (!bearerToken) {
      this.logger.warn('VERCEL_ACCESS_TOKEN is not set');
    }

    // Initialize axios instance for Vercel API
    this.vercelApi = axios.create({
      baseURL: 'https://api.vercel.com',
      headers: {
        Authorization: `Bearer ${bearerToken || ''}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getDomainStatus(
    dto: GetDomainStatusDto,
  ): Promise<DomainStatusResponseDto> {
    const { domain } = dto;

    if (!process.env.TRUST_PORTAL_PROJECT_ID) {
      throw new InternalServerErrorException(
        'TRUST_PORTAL_PROJECT_ID is not configured',
      );
    }

    if (!process.env.VERCEL_TEAM_ID) {
      throw new InternalServerErrorException(
        'VERCEL_TEAM_ID is not configured',
      );
    }

    if (!domain) {
      throw new BadRequestException('Domain is required');
    }

    try {
      this.logger.log(`Fetching domain status for: ${domain}`);

      // Get domain information including verification status
      // Vercel API endpoint: GET /v9/projects/{projectId}/domains/{domain}
      const response = await this.vercelApi.get<VercelDomainResponse>(
        `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${domain}`,
        {
          params: {
            teamId: process.env.VERCEL_TEAM_ID,
          },
        },
      );

      const domainInfo = response.data;

      const verification: DomainVerificationDto[] | undefined =
        domainInfo.verification?.map((v) => ({
          type: v.type,
          domain: v.domain,
          value: v.value,
          reason: v.reason,
        }));

      return {
        domain: domainInfo.name,
        verified: domainInfo.verified ?? false,
        verification,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get domain status for ${domain}:`,
        error instanceof Error ? error.stack : error,
      );

      // Handle axios errors with more detail
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        this.logger.error(`Vercel API error (${statusCode}): ${message}`);
      }

      throw new InternalServerErrorException(
        'Failed to get domain status from Vercel',
      );
    }
  }
}
