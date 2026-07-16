import { Module } from '@nestjs/common';
import { BrowserAutomationCrudService } from './browser-automation-crud.service';
import { BrowserAutomationExecutionService } from './browser-automation-execution.service';
import { BrowserAutomationRunStoreService } from './browser-automation-run-store.service';
import { BrowserAuthProfilesController } from './browser-auth-profiles.controller';
import { BrowserAuthProfileContextService } from './browser-auth-profile-context.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { BrowserInstructionTestService } from './browser-instruction-test.service';
import { BrowserbaseController } from './browserbase.controller';
import { BrowserbaseOrgContextService } from './browserbase-org-context.service';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserbaseService } from './browserbase.service';
import { BrowserCredentialSigninService } from './browser-credential-signin.service';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import { BrowserLoginAnalyzerService } from './browser-login-analyzer.service';
import { BROWSER_CREDENTIAL_VAULT_ADAPTER } from './credential-vault';
import { resolveBrowserCredentialVaultAdapter } from './browser-credential-vault.factory';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BrowserbaseController, BrowserAuthProfilesController],
  providers: [
    BrowserbaseService,
    BrowserbaseSessionService,
    BrowserAutomationCrudService,
    BrowserAutomationExecutionService,
    BrowserAutomationRunStoreService,
    BrowserAuthProfileContextService,
    BrowserAuthProfileService,
    BrowserbaseOrgContextService,
    BrowserbaseScreenshotService,
    BrowserEvidenceRunnerService,
    BrowserInstructionTestService,
    BrowserCredentialSigninService,
    BrowserCredentialStorageService,
    BrowserLoginAnalyzerService,
    {
      provide: BROWSER_CREDENTIAL_VAULT_ADAPTER,
      useFactory: resolveBrowserCredentialVaultAdapter,
    },
  ],
  exports: [BrowserbaseService],
})
export class BrowserbaseModule {}
