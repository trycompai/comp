import { z } from 'zod';

interface CsvInvite {
  email: string;
  roles: string[];
}

interface CsvParseError {
  email: string;
  error: string;
}

export interface CsvParseResult {
  invites: CsvInvite[];
  errors: CsvParseError[];
}

/**
 * Validates a CSV file before parsing: checks type, size, and format.
 * Returns an error string if invalid, or null if valid.
 */
export function validateCsvFile(file: File): string | null {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    return 'File must be a CSV.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be less than 5MB.';
  }
  return null;
}

/**
 * Parses CSV text content into invite objects.
 * Validates emails and roles per row, collecting errors for invalid rows.
 */
export function parseCsvContent(text: string): CsvParseResult {
  const lines = text.split('\n');
  const header = lines[0]?.toLowerCase() ?? '';

  if (!header.includes('email') || !header.includes('role')) {
    return {
      invites: [],
      errors: [{ email: 'Header', error: "CSV must contain 'email' and 'role' columns." }],
    };
  }

  const headers = header.split(',').map((h) => h.trim());
  const emailIndex = headers.findIndex((h) => h === 'email');
  const roleIndex = headers.findIndex((h) => h === 'role');

  if (emailIndex === -1 || roleIndex === -1) {
    return {
      invites: [],
      errors: [{ email: 'Header', error: "CSV must contain 'email' and 'role' columns." }],
    };
  }

  const dataRows = lines.slice(1).filter((line) => line.trim() !== '');
  if (dataRows.length === 0) {
    return {
      invites: [],
      errors: [{ email: 'File', error: 'CSV file does not contain any data rows.' }],
    };
  }

  const invites: CsvInvite[] = [];
  const errors: CsvParseError[] = [];

  for (const row of dataRows) {
    const columns = row.split(',').map((col) => col.trim());

    if (columns.length <= Math.max(emailIndex, roleIndex)) {
      errors.push({
        email: columns[emailIndex] || 'Invalid row',
        error: 'Invalid CSV row format',
      });
      continue;
    }

    const email = columns[emailIndex];
    const roleValue = columns[roleIndex];

    if (!email || !z.string().email().safeParse(email).success) {
      errors.push({ email: email || 'Invalid email', error: 'Invalid email format' });
      continue;
    }

    const roles = roleValue.split('|').map((r) => r.trim());
    const validRoles = roles.filter((role) => role.length > 0);

    if (validRoles.length === 0) {
      errors.push({ email, error: `Invalid role(s): ${roleValue}` });
      continue;
    }

    invites.push({ email: email.toLowerCase(), roles: validRoles });
  }

  return { invites, errors };
}
