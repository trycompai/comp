import { Module } from '@nestjs/common';
import { CloudSecurityController } from './cloud-security.controller';
import { CloudSecurityService } from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { IntegrationPlatformModule } from '../integration-platform/integration-platform.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [IntegrationPlatformModule, AuthModule],
  controllers: [CloudSecurityController],
  providers: [
    CloudSecurityService,
    CloudSecurityQueryService,
    CloudSecurityLegacyService,
    GCPSecurityService,
    AWSSecurityService,
    AzureSecurityService,
  ],
  exports: [CloudSecurityService],
})
export class CloudSecurityModule {}
