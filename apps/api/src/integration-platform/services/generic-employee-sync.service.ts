import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import type { SyncEmployee } from '@trycompai/integration-platform';
import { BUILT_IN_ROLE_PERMISSIONS } from '@trycompai/auth';

// ============================================================================
// Types
// ============================================================================

export interface SyncResultDetail {
  email: string;
  status: 'imported' | 'skipped' | 'deactivated' | 'reactivated' | 'error';
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
 * implementations (Google Workspace, Rippling, JumpCloud).
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

    // Build the set of role identifiers we'll accept on this sync. Anything
    // outside this set is dropped (e.g. a Microsoft DSL that mis-maps
    // jobTitle into role would otherwise plant "Senior Front End Engineer"
    // strings into member.role with no matching organization_role row).
    const customRoles: { name: string }[] = await db.organizationRole.findMany({
      where: { organizationId },
      select: { name: true },
    });
    const validRoleNames = new Set<string>([
      ...Object.keys(BUILT_IN_ROLE_PERMISSIONS),
      ...customRoles.map((r) => r.name),
    ]);

    const sanitizeRole = (raw: string | undefined | null): string => {
      if (!raw) return defaultRole;
      const tokens = raw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && validRoleNames.has(t));
      return tokens.length > 0 ? tokens.join(',') : defaultRole;
    };

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
          // Self-heal limbo roles: if the persisted member.role contains
          // tokens that don't map to any valid role today (e.g. an Entra
          // jobTitle planted by a misconfigured DSL pre-fix), drop them.
          // We only ever shrink the role string here — never overwrite a
          // valid assignment with whatever the provider sent.
          const healedRole = sanitizeRole(existingMember.role);
          const needsHeal = healedRole !== existingMember.role;
          if (needsHeal) {
            this.logger.warn(
              `[GenericSync] Healing limbo role for ${normalizedEmail}: "${existingMember.role}" → "${healedRole}"`,
            );
          }

          if (existingMember.deactivated && allowReactivation) {
            await db.member.update({
              where: { id: existingMember.id },
              data: {
                deactivated: false,
                isActive: true,
                ...(needsHeal ? { role: healedRole } : {}),
              },
            });
            results.reactivated++;
            results.details.push({
              email: normalizedEmail,
              status: 'reactivated',
            });
          } else {
            if (needsHeal) {
              await db.member.update({
                where: { id: existingMember.id },
                data: { role: healedRole },
              });
            }
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
        const sanitizedRole = sanitizeRole(employee.role);
        if (employee.role && sanitizedRole !== employee.role) {
          this.logger.warn(
            `[GenericSync] Provider "${providerName}" sent unrecognized role "${employee.role}" for ${normalizedEmail}; falling back to "${sanitizedRole}"`,
          );
        }
        await db.member.create({
          data: {
            organizationId,
            userId: existingUser.id,
            role: sanitizedRole,
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
            data: {
              deactivated: true,
              isActive: false,
              offboardDate: member.offboardDate ?? new Date(),
            },
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
          this.logger.error(
            `Error deactivating member ${memberEmail}: ${error}`,
          );
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
