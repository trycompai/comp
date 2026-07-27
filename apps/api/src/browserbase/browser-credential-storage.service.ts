import {
  BadRequestException,
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
  parseItemReference,
} from './onepassword-credential-item';

export interface StoreProfileCredentialsInput {
  organizationId: string;
  profileId: string;
  username: string;
  password: string;
  totpSeed?: string;
  /** Extra site-specific fields (e.g. workspace, subdomain). */
  extraFields?: { label: string; value: string }[];
  /** The vendor's own label for the identifier field (e.g. "IAM username"). */
  usernameLabel?: string;
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
        // Persist the detected identifier label so reconnects and scheduled
        // sign-ins show the real field name (undefined → Prisma leaves it as-is).
        identifierLabel: input.usernameLabel?.trim() || undefined,
      },
    });
  }

  /**
   * Whether an authenticator setup key (TOTP seed) is stored for this connection
   * — the source of truth for the "Automatic 2FA" status, read live from the
   * vault so no DB flag can drift. Returns false (never throws) when storage
   * isn't configured or the item can't be read.
   */
  async getProfileTotpStatus(input: {
    organizationId: string;
    profileId: string;
  }): Promise<{ configured: boolean }> {
    if (!isOnePasswordConfigured()) return { configured: false };

    const profile = await this.findProfile(input);
    const ref = profile.vaultExternalItemRef;
    if (!ref) return { configured: false };
    const { vaultId, itemId } = parseItemReference(ref);
    if (!vaultId || !itemId) return { configured: false };

    try {
      const client = await getOnePasswordClient();
      const item = await client.items.get(vaultId, itemId);
      const configured = item.fields.some(
        (field) => field.title === TOTP_FIELD_TITLE && field.value.trim().length > 0,
      );
      return { configured };
    } catch (error) {
      this.logger.warn('Failed to read TOTP status from 1Password', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { configured: false };
    }
  }

  /**
   * Attach or replace the authenticator setup key on a connection's existing
   * login item — WITHOUT re-collecting the username/password. Requires the
   * connection to already have a stored login.
   */
  async setProfileTotp(input: {
    organizationId: string;
    profileId: string;
    totpSeed: string;
  }): Promise<{ configured: boolean }> {
    if (!isOnePasswordConfigured()) {
      throw new ServiceUnavailableException(
        'Credential storage is not configured for this environment.',
      );
    }
    const seed = input.totpSeed.trim();
    if (!seed) {
      throw new BadRequestException('An authenticator setup key is required.');
    }

    const profile = await this.findProfile(input);
    const ref = profile.vaultExternalItemRef;
    const parsed = ref ? parseItemReference(ref) : { vaultId: '', itemId: '' };
    if (!parsed.vaultId || !parsed.itemId) {
      throw new BadRequestException(
        'Store a login for this connection before adding an authenticator key.',
      );
    }

    const client = await getOnePasswordClient();
    const { ItemFieldType } = await loadOnePasswordModule();
    const item = await client.items.get(parsed.vaultId, parsed.itemId);
    item.fields = [
      ...item.fields.filter((field) => field.title !== TOTP_FIELD_TITLE),
      {
        id: TOTP_FIELD_TITLE,
        title: TOTP_FIELD_TITLE,
        fieldType: ItemFieldType.Totp,
        value: seed,
      },
    ];
    await client.items.put(item);
    this.logger.log(`Set authenticator key for profile ${profile.id}.`);
    return { configured: true };
  }

  /**
   * Remove the stored authenticator setup key from a connection's login item
   * ("turn off" automatic 2FA). Idempotent — a no-op when nothing is stored.
   */
  async clearProfileTotp(input: {
    organizationId: string;
    profileId: string;
  }): Promise<{ configured: boolean }> {
    if (!isOnePasswordConfigured()) return { configured: false };

    const profile = await this.findProfile(input);
    const ref = profile.vaultExternalItemRef;
    if (!ref) return { configured: false };
    const { vaultId, itemId } = parseItemReference(ref);
    if (!vaultId || !itemId) return { configured: false };

    const client = await getOnePasswordClient();
    const item = await client.items.get(vaultId, itemId);
    const remaining = item.fields.filter(
      (field) => field.title !== TOTP_FIELD_TITLE,
    );
    if (remaining.length !== item.fields.length) {
      item.fields = remaining;
      await client.items.put(item);
      this.logger.log(`Removed authenticator key for profile ${profile.id}.`);
    }
    return { configured: false };
  }

  private async findProfile(input: {
    organizationId: string;
    profileId: string;
  }) {
    const profile = await db.browserAuthProfile.findFirst({
      where: { id: input.profileId, organizationId: input.organizationId },
    });
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }
    return profile;
  }

  /**
   * Best-effort removal of a profile's stored login from 1Password when its
   * connection is deleted, so we don't leave orphaned secrets in the vault.
   * Never throws — a failed cleanup shouldn't block removing the connection.
   */
  async deleteProfileCredentialItem(profile: {
    vaultExternalItemRef?: string | null;
  }): Promise<void> {
    if (!isOnePasswordConfigured() || !profile.vaultExternalItemRef) return;
    const { vaultId, itemId } = parseItemReference(profile.vaultExternalItemRef);
    if (!vaultId || !itemId) return;
    try {
      const client = await getOnePasswordClient();
      await client.items.delete(vaultId, itemId);
      this.logger.log(`Deleted 1Password item for a removed connection.`);
    } catch (error) {
      this.logger.warn('Failed to delete 1Password item on connection removal', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
