'use client';

import { AppShellRailItem } from '@trycompai/design-system';
import Link from 'next/link';

interface ShellRailNavItemProps {
  href: string;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
}

/**
 * A single icon in the far-left product rail (Compliance, Trust, Security, Settings, Admin).
 *
 * CS-773: Do NOT pass an explicit `id` to `AppShellRailItem`. `AppShellRail` re-renders these
 * same rail items into the always-mounted mobile drawer, so any hard-coded `id` becomes a
 * duplicate DOM id. The design system uses that `id` as the Base UI tooltip trigger's id, and
 * two triggers sharing one id collide in Base UI's floating tree — the active (desktop) trigger
 * is treated as unmounted and the tooltip auto-closes ~0.1s after opening (the "tooltip glitching
 * on hover" bug). Leaving the id unset lets the design system generate a unique id per instance.
 */
export function ShellRailNavItem({ href, isActive, icon, label }: ShellRailNavItemProps) {
  return (
    <Link href={href}>
      <AppShellRailItem isActive={isActive} icon={icon} label={label} />
    </Link>
  );
}
