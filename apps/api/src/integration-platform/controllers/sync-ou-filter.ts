/**
 * Filters users by organizational unit paths.
 * Matches users whose orgUnitPath equals or is a child of any target OU.
 *
 * @param users - Array of objects with an orgUnitPath property
 * @param targetOrgUnits - Array of OU paths to include (undefined/empty = all users)
 * @returns Filtered array of users
 */
export function filterUsersByOrgUnits<T extends { orgUnitPath?: string }>(
  users: T[],
  targetOrgUnits: string[] | undefined,
): T[] {
  if (!targetOrgUnits || targetOrgUnits.length === 0) {
    return users;
  }

  return users.filter((user) => {
    const userOu = user.orgUnitPath ?? '/';
    return targetOrgUnits.some(
      (ou) => ou === '/' || userOu === ou || userOu.startsWith(`${ou}/`),
    );
  });
}
