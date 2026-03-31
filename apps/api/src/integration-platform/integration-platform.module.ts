import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthAppsController } from './controllers/oauth-apps.controller';
import { ConnectionsController } from './controllers/connections.controller';
import { AdminIntegrationsController } from './controllers/admin-integrations.controller';
import { DynamicIntegrationsController } from './controllers/dynamic-integrations.controller';
import { ChecksController } from './controllers/checks.controller';
import { VariablesController } from './controllers/variables.controller';
import { TaskIntegrationsController } from './controllers/task-integrations.controller';
import { WebhookController } from './controllers/webhook.controller';
import { SyncController } from './controllers/sync.controller';
import { CredentialVaultService } from './services/credential-vault.service';
import { ConnectionService } from './services/connection.service';
import { OAuthCredentialsService } from './services/oauth-credentials.service';
import { AutoCheckRunnerService } from './services/auto-check-runner.service';
import { ConnectionAuthTeardownService } from './services/connection-auth-teardown.service';
import { OAuthTokenRevocationService } from './services/oauth-token-revocation.service';
import { DynamicManifestLoaderService } from './services/dynamic-manifest-loader.service';
import { ProviderRepository } from './repositories/provider.repository';
import { ConnectionRepository } from './repositories/connection.repository';
import { CredentialRepository } from './repositories/credential.repository';
import { OAuthStateRepository } from './repositories/oauth-state.repository';
import { OAuthAppRepository } from './repositories/oauth-app.repository';
import { PlatformCredentialRepository } from './repositories/platform-credential.repository';
import { CheckRunRepository } from './repositories/check-run.repository';
import { DynamicIntegrationRepository } from './repositories/dynamic-integration.repository';
import { DynamicCheckRepository } from './repositories/dynamic-check.repository';
import { IntegrationSyncLoggerService } from './services/integration-sync-logger.service';
import { GenericEmployeeSyncService } from './services/generic-employee-sync.service';

@Module({
  imports: [AuthModule],
  controllers: [
    OAuthController,
    OAuthAppsController,
    ConnectionsController,
    AdminIntegrationsController,
    DynamicIntegrationsController,
    ChecksController,
    VariablesController,
    TaskIntegrationsController,
    WebhookController,
    SyncController,
  ],
  providers: [
    // Services
    CredentialVaultService,
    ConnectionService,
    OAuthCredentialsService,
    AutoCheckRunnerService,
    OAuthTokenRevocationService,
    ConnectionAuthTeardownService,
    DynamicManifestLoaderService,
    IntegrationSyncLoggerService,
    GenericEmployeeSyncService,
    // Repositories
    ProviderRepository,
    ConnectionRepository,
    CredentialRepository,
    OAuthStateRepository,
    OAuthAppRepository,
    PlatformCredentialRepository,
    CheckRunRepository,
    DynamicIntegrationRepository,
    DynamicCheckRepository,
  ],
  exports: [
    CredentialVaultService,
    ConnectionService,
    OAuthCredentialsService,
    AutoCheckRunnerService,
    DynamicManifestLoaderService,
  ],
})
export class IntegrationPlatformModule {}
