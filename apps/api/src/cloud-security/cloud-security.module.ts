import { Module } from '@nestjs/common';
import { CloudSecurityController } from './cloud-security.controller';
import { CloudSecurityService } from './cloud-security.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { IntegrationPlatformModule } from '../integration-platform/integration-platform.module';

@Module({
  imports: [IntegrationPlatformModule],
  controllers: [CloudSecurityController],
  providers: [
    CloudSecurityService,
    GCPSecurityService,
    AWSSecurityService,
    AzureSecurityService,
  ],
  exports: [CloudSecurityService],
})
export class CloudSecurityModule {}
