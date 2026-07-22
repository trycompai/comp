/**
 * ⚠️ TEST FILE — DELETE ME. Do NOT merge.
 *
 * Deliberately vulnerable code used ONLY to verify that the security-review
 * GitHub Action posts inline PR comments. This file is not imported or
 * registered anywhere, so nothing here is reachable at runtime.
 */
import { execSync } from 'node:child_process';
import { db } from '@db';

// SQL injection: user-controlled `term` is interpolated straight into a raw query.
export async function searchUsersDemo(term: string): Promise<unknown> {
  return db.$queryRawUnsafe(
    `SELECT id, email FROM "User" WHERE email LIKE '%${term}%'`,
  );
}

// Command injection: user-controlled `filename` is passed to a shell.
export function exportReportDemo(filename: string): string {
  return execSync(`cat /tmp/reports/${filename}`).toString();
}
