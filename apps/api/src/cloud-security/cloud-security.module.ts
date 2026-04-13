import { Module } from '@nestjs/common';
import { CloudSecurityController } from './cloud-security.controller';
import { CloudSecurityService } from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { RemediationController } from './remediation.controller';
import { RemediationService } from './remediation.service';
import { GcpRemediationService } from './gcp-remediation.service';
import { AzureRemediationService } from './azure-remediation.service';
import { AiRemediationService } from './ai-remediation.service';
import { CloudSecurityActivityService } from './cloud-security-activity.service';
import { IntegrationPlatformModule } from '../integration-platform/integration-platform.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [IntegrationPlatformModule, AuthModule],
  controllers: [CloudSecurityController, RemediationController],
  providers: [
    CloudSecurityService,
    CloudSecurityQueryService,
    CloudSecurityLegacyService,
    CloudSecurityActivityService,
    GCPSecurityService,
    AWSSecurityService,
    AzureSecurityService,
    RemediationService,
    GcpRemediationService,
    AzureRemediationService,
    AiRemediationService,
  ],
  exports: [CloudSecurityService],
})
export class CloudSecurityModule {}
