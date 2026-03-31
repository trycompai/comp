import { Injectable, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { SyncEmployee } from '@trycompai/integration-platform';

// ============================================================================
// Types
// ============================================================================

export interface SyncResultDetail {
  email: string;
  status:
    | 'imported'
    | 'skipped'
    | 'deactivated'
    | 'reactivated'
    | 'error';
  reason?: string;
}

export interface SyncResult {
  success: boolean;
  totalFound: number;
  imported: number;
  skipped: number;
  deactivated: number;
  reactivated: number;
  errors: number;
  details: SyncResultDetail[];
}

export interface ProcessEmployeesOptions {
  /** Default role for new members. Defaults to 'employee'. */
  defaultRole?: string;
  /** Whether to reactivate previously deactivated members. Defaults to false. */
  allowReactivation?: boolean;
  /** Roles that should never be auto-deactivated. Defaults to owner/admin/auditor. */
  protectedRoles?: string[];
  /** Provider slug for deactivation reason messages. */
  providerName?: string;
}

const DEFAULT_PROTECTED_ROLES = ['owner', 'admin', 'auditor'];

// ============================================================================
// Service
// ============================================================================

/**
 * Generic employee sync service that handles the platform-generic operations:
 * - Creating users and members from a standardized employee list
 * - Deactivating members no longer present in the provider
 * - Safety guards (never deactivate privileged roles)
 *
 * This extracts the common pattern from SyncController's 4 provider-specific
 * implementations (Google Workspace, Rippling, JumpCloud, Ramp).
 *
 * The provider-specific logic (fetching users, normalizing fields) is handled
 * by the dynamic integration's syncDefinition (DSL/code steps).
 */
@Injectable()
export class GenericEmployeeSyncService {
  private readonly logger = new Logger(GenericEmployeeSyncService.name);

  /**
   * Process a standardized employee list into DB operations.
   *
   * Phase 1: Import active employees (create User if needed, create Member if needed)
   * Phase 2: Deactivate members no longer present in the provider
   */
  async processEmployees({
    organizationId,
    employees,
    options = {},
  }: {
    organizationId: string;
    employees: SyncEmployee[];
    options?: ProcessEmployeesOptions;
  }): Promise<SyncResult> {
    const defaultRole = options.defaultRole ?? 'employee';
    const allowReactivation = options.allowReactivation ?? false;
    const protectedRoles = options.protectedRoles ?? DEFAULT_PROTECTED_ROLES;
    const providerName = options.providerName ?? 'provider';

    const results: SyncResult = {
      success: true,
      totalFound: employees.length,
      imported: 0,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      errors: 0,
      details: [],
    };

    this.logger.log(
      `[GenericSync] Processing ${employees.length} employees for org="${organizationId}" provider="${providerName}"`,
    );

    // Separate employees by status
    const activeEmployees = employees.filter((e) => e.status === 'active');
    const inactiveEmails = new Set(
      employees
        .filter((e) => e.status !== 'active')
        .map((e) => e.email.toLowerCase()),
    );
    const activeEmails = new Set(
      activeEmployees.map((e) => e.email.toLowerCase()),
    );

    // Build domain set from all employees (for domain-scoped deactivation)
    const providerDomains = new Set<string>();
    for (const emp of employees) {
      const domain = emp.email.toLowerCase().split('@')[1];
      if (domain) providerDomains.add(domain);
    }

    this.logger.log(
      `[GenericSync] Employee breakdown: active=${activeEmployees.length} inactive/suspended=${inactiveEmails.size} domains=${Array.from(providerDomains).join(',')}`,
    );

    // ====================================================================
    // Phase 1: Import active employees
    // ====================================================================
    for (const employee of activeEmployees) {
      const normalizedEmail = employee.email.toLowerCase();
      const displayName =
        employee.name ||
        [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
        normalizedEmail.split('@')[0] ||
        normalizedEmail;

      try {
        // Find or create User
        let existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!existingUser) {
          existingUser = await db.user.create({
            data: {
              email: normalizedEmail,
              name: displayName,
              emailVerified: true,
            },
          });
        }

        // Check if Member already exists in this org
        const existingMember = await db.member.findFirst({
          where: {
            organizationId,
            userId: existingUser.id,
          },
        });

        if (existingMember) {
          if (existingMember.deactivated && allowReactivation) {
            // Reactivate the member
            await db.member.update({
              where: { id: existingMember.id },
              data: { deactivated: false, isActive: true },
            });
            results.reactivated++;
            results.details.push({
              email: normalizedEmail,
              status: 'reactivated',
            });
          } else {
            results.skipped++;
            results.details.push({
              email: normalizedEmail,
              status: 'skipped',
              reason: existingMember.deactivated
                ? 'Member is deactivated'
                : 'Already a member',
            });
          }
          continue;
        }

        // Create new member
        await db.member.create({
          data: {
            organizationId,
            userId: existingUser.id,
            role: employee.role || defaultRole,
            isActive: true,
          },
        });

        results.imported++;
        results.details.push({
          email: normalizedEmail,
          status: 'imported',
        });
      } catch (error) {
        this.logger.error(
          `Error importing employee ${normalizedEmail}: ${error}`,
        );
        results.errors++;
        results.details.push({
          email: normalizedEmail,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `[GenericSync] Phase 1 complete: imported=${results.imported} skipped=${results.skipped} reactivated=${results.reactivated} errors=${results.errors}`,
    );

    // ====================================================================
    // Phase 2: Deactivate members no longer in provider
    // ====================================================================
    const allOrgMembers = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      include: {
        user: true,
      },
    });

    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];

      // Only check members whose email domain matches the provider's domains
      if (!memberDomain || !providerDomains.has(memberDomain)) {
        continue;
      }

      // Safety guard: never auto-deactivate privileged members
      const memberRoles = member.role
        .split(',')
        .map((role) => role.trim().toLowerCase());
      if (protectedRoles.some((pr) => memberRoles.includes(pr))) {
        continue;
      }

      // If member is not in active set AND not already accounted for, deactivate
      const isSuspended = inactiveEmails.has(memberEmail);
      const isRemoved = !activeEmails.has(memberEmail) && !isSuspended;

      if (isSuspended || isRemoved) {
        try {
          await db.member.update({
            where: { id: member.id },
            data: { deactivated: true, isActive: false },
          });
          results.deactivated++;
          results.details.push({
            email: memberEmail,
            status: 'deactivated',
            reason: isSuspended
              ? `User is suspended in ${providerName}`
              : `User was removed from ${providerName}`,
          });
        } catch (error) {
          this.logger.error(`Error deactivating member ${memberEmail}: ${error}`);
          results.errors++;
        }
      }
    }

    results.success = results.errors === 0;

    this.logger.log(
      `Sync complete for ${providerName}: ${results.imported} imported, ${results.reactivated} reactivated, ${results.deactivated} deactivated, ${results.skipped} skipped, ${results.errors} errors`,
    );

    return results;
  }
}
