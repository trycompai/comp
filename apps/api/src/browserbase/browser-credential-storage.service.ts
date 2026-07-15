import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { db } from '@db';
import type { ItemField } from '@1password/sdk';
import {
  getOnePasswordClient,
  isOnePasswordConfigured,
  loadOnePasswordModule,
  type OnePasswordClient,
} from './onepassword-client';
import {
  ONEPASSWORD_PROVIDER,
  PASSWORD_FIELD_TITLE,
  TOTP_FIELD_TITLE,
  USERNAME_FIELD_TITLE,
  buildItemReference,
  buildOrgVaultTitle,
} from './onepassword-credential-item';

export interface StoreProfileCredentialsInput {
  organizationId: string;
  profileId: string;
  username: string;
  password: string;
  totpSeed?: string;
  /** Extra site-specific fields (e.g. workspace, subdomain). */
  extraFields?: { label: string; value: string }[];
}

/**
 * Writes a browser auth profile's login (username, password, optional TOTP seed)
 * into a per-organization 1Password vault and points the profile at the created
 * item. Comp never persists the raw secrets itself — only the `op://` reference.
 */
@Injectable()
export class BrowserCredentialStorageService {
  private readonly logger = new Logger(BrowserCredentialStorageService.name);

  async storeProfileCredentials(input: StoreProfileCredentialsInput) {
    if (!isOnePasswordConfigured()) {
      throw new ServiceUnavailableException(
        'Credential storage is not configured for this environment.',
      );
    }

    const profile = await db.browserAuthProfile.findFirst({
      where: { id: input.profileId, organizationId: input.organizationId },
    });
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }

    const client = await getOnePasswordClient();
    const vaultId = await this.ensureOrgVault({
      client,
      organizationId: input.organizationId,
    });

    const fields = await this.buildLoginFields({
      username: input.username,
      password: input.password,
      totpSeed: input.totpSeed,
      extraFields: input.extraFields,
    });

    const { ItemCategory } = await loadOnePasswordModule();
    const item = await client.items.create({
      category: ItemCategory.Login,
      vaultId,
      title: `${profile.displayName} (${profile.hostname})`,
      fields,
    });

    const itemRef = buildItemReference(vaultId, item.id);
    this.logger.log(
      `Stored browser credentials for profile ${profile.id} in 1Password.`,
    );

    return db.browserAuthProfile.update({
      where: { id: profile.id },
      data: {
        vaultProvider: ONEPASSWORD_PROVIDER,
        vaultExternalItemRef: itemRef,
        vaultConnectionId: vaultId,
      },
    });
  }

  private async ensureOrgVault({
    client,
    organizationId,
  }: {
    client: OnePasswordClient;
    organizationId: string;
  }): Promise<string> {
    const title = buildOrgVaultTitle(organizationId);
    const existing = await client.vaults.list();
    const match = existing.find((vault) => vault.title === title);
    if (match) return match.id;

    const created = await client.vaults.create({
      title,
      description: `Browser automation logins for organization ${organizationId}.`,
    });
    this.logger.log(
      `Created 1Password vault for organization ${organizationId}.`,
    );
    return created.id;
  }

  private async buildLoginFields({
    username,
    password,
    totpSeed,
    extraFields,
  }: {
    username: string;
    password: string;
    totpSeed?: string;
    extraFields?: { label: string; value: string }[];
  }): Promise<ItemField[]> {
    const { ItemFieldType } = await loadOnePasswordModule();
    const fields: ItemField[] = [
      {
        id: USERNAME_FIELD_TITLE,
        title: USERNAME_FIELD_TITLE,
        fieldType: ItemFieldType.Text,
        value: username,
      },
      {
        id: PASSWORD_FIELD_TITLE,
        title: PASSWORD_FIELD_TITLE,
        fieldType: ItemFieldType.Concealed,
        value: password,
      },
    ];

    if (totpSeed?.trim()) {
      fields.push({
        id: TOTP_FIELD_TITLE,
        title: TOTP_FIELD_TITLE,
        fieldType: ItemFieldType.Totp,
        value: totpSeed.trim(),
      });
    }

    for (const field of extraFields ?? []) {
      const label = field.label.trim();
      if (!label || !field.value.trim()) continue;
      fields.push({
        id: label,
        title: label,
        fieldType: ItemFieldType.Text,
        value: field.value,
      });
    }

    return fields;
  }
}
