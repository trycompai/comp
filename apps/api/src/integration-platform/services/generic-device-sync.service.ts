import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { db } from '@db';
import type { SyncDevice } from '@trycompai/integration-platform';

// ============================================================================
// Types
// ============================================================================

export interface DeviceSyncResultDetail {
  identifier: string;
  status: 'imported' | 'updated' | 'skipped' | 'removed' | 'error';
  reason?: string;
}

export interface DeviceSyncResult {
  success: boolean;
  totalFound: number;
  imported: number;
  updated: number;
  skipped: number;
  removed: number;
  errors: number;
  details: DeviceSyncResultDetail[];
}

interface SyncedIdentifier {
  serialNumber?: string;
  externalId?: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Generic device sync service that handles platform-generic operations:
 * - Creating or updating Device records from a standardized device list
 * - Removing devices no longer present in the provider
 *
 * Mirrors GenericEmployeeSyncService but for the device import flow.
 */
@Injectable()
export class GenericDeviceSyncService {
  private readonly logger = new Logger(GenericDeviceSyncService.name);

  async processDevices({
    organizationId,
    connectionId,
    devices,
    options = {},
  }: {
    organizationId: string;
    connectionId: string;
    devices: SyncDevice[];
    options?: { providerName?: string; isDirectorySource?: boolean };
  }): Promise<DeviceSyncResult> {
    const providerName = options.providerName ?? 'provider';
    const isDirectorySource = options.isDirectorySource ?? false;

    const result: DeviceSyncResult = {
      success: true,
      totalFound: devices.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      removed: 0,
      errors: 0,
      details: [],
    };

    this.logger.log(
      `[DeviceSync] Processing ${devices.length} devices for org="${organizationId}" provider="${providerName}"`,
    );

    const activeDevices = devices.filter((d) => d.status === 'active');
    const syncedIdentifiers: SyncedIdentifier[] = [];

    // ==================================================================
    // Phase 1: Import active devices
    // ==================================================================
    for (const device of activeDevices) {
      const identifier =
        device.serialNumber ?? device.externalId ?? device.name;

      // A device with neither serialNumber nor externalId can never be matched
      // on a later sync, so importing it would create an untrackable orphan.
      if (!device.serialNumber && !device.externalId) {
        result.skipped++;
        result.details.push({
          identifier,
          status: 'skipped',
          reason: 'No stable identifier (serialNumber or externalId required)',
        });
        continue;
      }

      try {
        const normalizedEmail = device.userEmail.toLowerCase();

        // Track ALL sync identifiers for Phase 2 (even if member doesn't exist yet)
        syncedIdentifiers.push({
          serialNumber: device.serialNumber,
          externalId: device.externalId,
        });

        // Find member by email in this org
        const member = await db.member.findFirst({
          where: {
            organizationId,
            deactivated: false,
            user: { email: normalizedEmail },
          },
          select: { id: true },
        });

        if (!member) {
          result.skipped++;
          result.details.push({
            identifier,
            status: 'skipped',
            reason: `No matching member for email ${normalizedEmail}`,
          });
          continue;
        }

        // Find existing device — serialNumber match takes priority
        let existingDevice: { id: string; source: string } | null = null;
        if (device.serialNumber) {
          existingDevice = await db.device.findFirst({
            where: {
              serialNumber: device.serialNumber,
              organizationId,
            },
            select: { id: true, source: true },
          });
        }

        // Never overwrite a device owned by the agent or Fleet that happens to
        // share a hardware serial — doing so would hijack (and later expose to
        // deletion) a device managed by a richer source. Leave it untouched.
        if (existingDevice && existingDevice.source !== 'integration') {
          result.skipped++;
          result.details.push({
            identifier,
            status: 'skipped',
            reason: `Serial already managed by "${existingDevice.source}" — left untouched`,
          });
          continue;
        }

        if (!existingDevice && device.externalId) {
          existingDevice = await db.device.findFirst({
            where: {
              externalDeviceId: device.externalId,
              integrationConnectionId: connectionId,
              source: 'integration',
            },
            select: { id: true, source: true },
          });
        }

        const updateData = {
          name: device.name,
          hostname: device.hostname ?? device.name,
          platform: device.platform,
          osVersion: device.osVersion ?? 'Unknown',
          hardwareModel: device.hardwareModel,
          lastCheckIn: new Date(),
          source: 'integration' as const,
          integrationConnectionId: connectionId,
          externalDeviceId: device.externalId,
        };

        if (existingDevice) {
          await db.device.update({
            where: { id: existingDevice.id },
            data: { ...updateData, memberId: member.id },
          });
          result.updated++;
          result.details.push({ identifier, status: 'updated' });
        } else {
          try {
            await db.device.create({
              data: {
                ...updateData,
                serialNumber: device.serialNumber,
                memberId: member.id,
                organizationId,
              },
            });
            result.imported++;
            result.details.push({ identifier, status: 'imported' });
          } catch (createError) {
            if (
              createError instanceof Prisma.PrismaClientKnownRequestError &&
              createError.code === 'P2002'
            ) {
              this.logger.warn(
                `[DeviceSync] Unique constraint hit for ${identifier} — falling back to update`,
              );
              const conflicting = await db.device.findFirst({
                where: {
                  serialNumber: device.serialNumber,
                  organizationId,
                },
                select: { id: true, source: true },
              });
              if (conflicting && conflicting.source !== 'integration') {
                result.skipped++;
                result.details.push({
                  identifier,
                  status: 'skipped',
                  reason: `Serial already managed by "${conflicting.source}" — left untouched`,
                });
              } else if (conflicting) {
                await db.device.update({
                  where: { id: conflicting.id },
                  data: { ...updateData, memberId: member.id },
                });
                result.updated++;
                result.details.push({ identifier, status: 'updated' });
              }
            } else {
              throw createError;
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing device ${identifier}: ${error}`,
        );
        result.errors++;
        result.details.push({
          identifier,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `[DeviceSync] Phase 1 complete: imported=${result.imported} updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`,
    );

    // ==================================================================
    // Phase 2: Remove disappeared devices
    // ==================================================================

    // Phase 2 removal only runs when the provider is the authoritative device
    // source (isDirectorySource). Like the employee sync, a non-authoritative
    // or partial provider response must NEVER delete devices it simply didn't
    // return this run.
    // WARNING: the removal below is a HARD delete that cascades to the devices'
    // Finding rows. It must be converted to a recoverable soft-removal before
    // any provider sets isDirectorySource=true.
    if (!isDirectorySource) {
      this.logger.log(
        `[DeviceSync] Phase 2 skipped for "${providerName}": isDirectorySource=false. Devices absent from the sync payload were left alone.`,
      );
    } else if (syncedIdentifiers.length === 0) {
      this.logger.log(
        '[DeviceSync] No devices successfully processed — skipping Phase 2 removal',
      );
    } else {
      const existingIntegrationDevices = await db.device.findMany({
        where: {
          organizationId,
          integrationConnectionId: connectionId,
          source: 'integration',
        },
        select: {
          id: true,
          serialNumber: true,
          externalDeviceId: true,
        },
      });

      const syncedSerials = new Set(
        syncedIdentifiers
          .map((s) => s.serialNumber)
          .filter((v): v is string => Boolean(v)),
      );
      const syncedExternalIds = new Set(
        syncedIdentifiers
          .map((s) => s.externalId)
          .filter((v): v is string => Boolean(v)),
      );

      const toRemove = existingIntegrationDevices.filter((d) => {
        const matchedBySerial =
          d.serialNumber && syncedSerials.has(d.serialNumber);
        const matchedByExternal =
          d.externalDeviceId && syncedExternalIds.has(d.externalDeviceId);
        return !matchedBySerial && !matchedByExternal;
      });

      if (toRemove.length > 0) {
        const idsToDelete = toRemove.map((d) => d.id);

        try {
          await db.device.deleteMany({
            where: { id: { in: idsToDelete } },
          });
          result.removed = toRemove.length;

          for (const device of toRemove) {
            result.details.push({
              identifier:
                device.serialNumber ?? device.externalDeviceId ?? device.id,
              status: 'removed',
              reason: `Device no longer reported by ${providerName}`,
            });
          }
        } catch (deleteError) {
          this.logger.error(
            `[DeviceSync] Failed to delete ${idsToDelete.length} devices: ${deleteError}`,
          );
          result.errors += idsToDelete.length;
        }
      }
    }

    result.success = result.errors === 0;

    this.logger.log(
      `[DeviceSync] Sync complete for ${providerName}: ${result.imported} imported, ${result.updated} updated, ${result.removed} removed, ${result.skipped} skipped, ${result.errors} errors`,
    );

    return result;
  }
}
