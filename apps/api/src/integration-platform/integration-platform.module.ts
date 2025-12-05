import { Module } from '@nestjs/common';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthAppsController } from './controllers/oauth-apps.controller';
import { ConnectionsController } from './controllers/connections.controller';
import { AdminIntegrationsController } from './controllers/admin-integrations.controller';
import { ChecksController } from './controllers/checks.controller';
import { VariablesController } from './controllers/variables.controller';
import { TaskIntegrationsController } from './controllers/task-integrations.controller';
import { WebhookController } from './controllers/webhook.controller';
import { SyncController } from './controllers/sync.controller';
import { CredentialVaultService } from './services/credential-vault.service';
import { ConnectionService } from './services/connection.service';
import { OAuthCredentialsService } from './services/oauth-credentials.service';
import { AutoCheckRunnerService } from './services/auto-check-runner.service';
import { ProviderRepository } from './repositories/provider.repository';
import { ConnectionRepository } from './repositories/connection.repository';
import { CredentialRepository } from './repositories/credential.repository';
import { OAuthStateRepository } from './repositories/oauth-state.repository';
import { OAuthAppRepository } from './repositories/oauth-app.repository';
import { PlatformCredentialRepository } from './repositories/platform-credential.repository';
import { CheckRunRepository } from './repositories/check-run.repository';

@Module({
  controllers: [
    OAuthController,
    OAuthAppsController,
    ConnectionsController,
    AdminIntegrationsController,
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
    // Repositories
    ProviderRepository,
    ConnectionRepository,
    CredentialRepository,
    OAuthStateRepository,
    OAuthAppRepository,
    PlatformCredentialRepository,
    CheckRunRepository,
  ],
  exports: [
    CredentialVaultService,
    ConnectionService,
    OAuthCredentialsService,
    AutoCheckRunnerService,
  ],
})
export class IntegrationPlatformModule {}
