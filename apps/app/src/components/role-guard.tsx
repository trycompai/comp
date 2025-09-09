'use client';

import { useAuth } from '@/hooks/use-auth';
import { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: ReactNode;
  requireWrite?: boolean;
}

/**
 * Component that conditionally renders children based on user role
 * @param children - content to render if user has permission
 * @param allowedRoles - array of roles that are allowed to see the content
 * @param fallback - optional fallback content to render if user doesn't have permission
 * @param requireWrite - if true, hides content for readonly users
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
  requireWrite = false,
}: RoleGuardProps) {
  const { member } = useAuth();

  // If we don't have member info, don't render anything
  if (!member) {
    return fallback;
  }

  // If requireWrite is true, hide for readonly users
  if (requireWrite && member.role === 'readonly') {
    return fallback;
  }

  // If allowedRoles is specified, check if user has one of the allowed roles
  if (allowedRoles && !allowedRoles.includes(member.role)) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Component that only shows content to users who can write (not readonly)
 */
export function WriteGuard({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard requireWrite fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * Component that only shows content to specific roles
 */
export function RoleSpecificGuard({
  children,
  roles,
  fallback = null,
}: {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={roles} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
